import { useMemo, useState } from "react";
import { Box, Checkbox, ListItemText, Menu, MenuItem } from "@mui/material";
import { ViewColumnRounded } from "@mui/icons-material";
import { DataGrid, DataGridProps, GridColDef, GridColumnVisibilityModel, GridRenderCellParams, GridValidRowModel } from "@mui/x-data-grid";
import StyledButton from "../StyledButton";

interface DataTableProps<R extends GridValidRowModel> extends DataGridProps<R> {
    // A "#" column numbering the rows 1…N, page after page (rankings read as positions). Off while searching (a search's
    // matches aren't positions — useServerTable turns it off then) and for tables with a rank column of their own.
    rowNumbers?: boolean;
    // The Columns button (hide / show columns, remembered on this device). Off for tables with little to hide.
    columnPicker?: boolean;
    // Where this table's column choice is kept; by default the page path and the table's columns.
    columnsKey?: string;
}

interface ColumnPickerProps {
    columns: { field: string; headerName: string }[];
    hidden: GridColumnVisibilityModel;
    onToggle: (field: string) => void;
}

declare module "@mui/x-data-grid" {
    interface ToolbarPropsOverrides {
        picker?: ColumnPickerProps;
    }
}

// Its position in the whole list: the row's place on this page plus the pages before it.
const NUMBER_COLUMN: GridColDef = {
    field: "__row_number",
    headerName: "#",
    width: 56,
    sortable: false,
    filterable: false,
    disableColumnMenu: true,
    renderCell: ({ api, id }: GridRenderCellParams) => {
        const { page, pageSize } = api.state.pagination.paginationModel;
        return <span style={{ color: "var(--lr-text-secondary)", fontWeight: 600 }}>{page * pageSize + api.getRowIndexRelativeToVisibleRows(id) + 1}</span>;
    },
};

// The table's own slim top bar: the Columns button and its checklist.
function ColumnsToolbar({ picker }: { picker?: ColumnPickerProps }) {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    if (!picker) return null;
    const hiddenCount = picker.columns.filter((c) => picker.hidden[c.field] === false).length;

    return (
        <Box sx={{ display: "flex", justifyContent: "flex-end", px: 1, py: 0.5, borderBottom: "1px solid var(--lr-border)" }}>
            <StyledButton size="small" startIcon={<ViewColumnRounded />} onClick={(e) => setAnchor(e.currentTarget)} aria-haspopup="menu" sx={{ px: 1.5, color: "var(--lr-primary)", fontSize: 13 }}>
                Columns{hiddenCount ? ` · ${hiddenCount} hidden` : ""}
            </StyledButton>
            <Menu anchorEl={anchor} open={anchor !== null} onClose={() => setAnchor(null)}>
                {picker.columns.map((c) => (
                    <MenuItem key={c.field} dense onClick={() => picker.onToggle(c.field)}>
                        <Checkbox size="small" checked={picker.hidden[c.field] !== false} sx={{ p: 0.5, mr: 1 }} />
                        <ListItemText primary={c.headerName} />
                    </MenuItem>
                ))}
            </Menu>
        </Box>
    );
}

const readHidden = (key: string): GridColumnVisibilityModel => {
    try {
        return JSON.parse(localStorage.getItem(key) ?? "{}") as GridColumnVisibilityModel;
    } catch {
        return {};
    }
};

// The app's table: MUI X DataGrid themed with the --lr-* tokens (so it follows dark mode). Grows with
// its rows (autoHeight) so AppLayout's <main> stays the only scroller. Spread props; caller sx last.
export default function DataTable<R extends GridValidRowModel>({ sx, rowNumbers = true, columnPicker = true, columnsKey, columns, ...props }: DataTableProps<R>) {
    const shown = useMemo(() => (rowNumbers ? [NUMBER_COLUMN as GridColDef<R>, ...columns] : columns), [rowNumbers, columns]);
    // Offered for hiding: every titled column but the table's first (what each row is — unless it says `hideable: true`) and
    // any marked `hideable: false`; untitled ones are controls (open / remove buttons).
    const hideable = useMemo(
        () =>
            shown
                .filter((c) => c.hideable !== false && !!c.headerName && (c !== columns[0] || c.hideable === true))
                .map((c) => ({ field: c.field, headerName: c.headerName as string })),
        [shown, columns],
    );
    const key = columnsKey ?? `lr-columns:${typeof window === "undefined" ? "" : window.location.pathname}:${columns.map((c) => c.field).join(",")}`;
    // By key: a table whose columns change (tabs) keeps a choice per set of columns.
    const [chosen, setChosen] = useState<Record<string, GridColumnVisibilityModel>>({});
    const hidden = chosen[key] ?? readHidden(key);
    const setHidden = (model: GridColumnVisibilityModel) => setChosen((c) => ({ ...c, [key]: model }));
    const picker = columnPicker && hideable.length >= 3;

    const toggle = (field: string) => {
        const next = { ...hidden, [field]: hidden[field] === false };
        setHidden(next);
        try {
            localStorage.setItem(key, JSON.stringify(next));
        } catch {
            // Private mode: the choice still applies on this page.
        }
    };

    return (
        <DataGrid
            autoHeight
            density="comfortable"
            disableRowSelectionOnClick
            disableColumnMenu
            pageSizeOptions={[25, 50, 100]}
            columnVisibilityModel={hidden}
            onColumnVisibilityModelChange={setHidden}
            showToolbar={picker}
            slots={{ toolbar: ColumnsToolbar }}
            slotProps={{ toolbar: { picker: picker ? { columns: hideable, hidden, onToggle: toggle } : undefined } }}
            {...props}
            columns={shown}
            sx={{
                border: "1px solid var(--lr-border)",
                borderRadius: 3,
                backgroundColor: "var(--lr-surface)",
                color: "var(--lr-text-body)",
                fontSize: 13,
                "--DataGrid-containerBackground": "var(--lr-surface-dim)",
                "--DataGrid-rowBorderColor": "var(--lr-border)",
                "& .MuiDataGrid-columnHeaders": { borderBottom: "1px solid var(--lr-border)" },
                "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 600, color: "var(--lr-text-secondary)", fontSize: 12 },
                "& .MuiDataGrid-row:hover": { backgroundColor: "var(--lr-surface-hover)" },
                "& .MuiDataGrid-cell": { display: "flex", alignItems: "center" },
                "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus": { outline: "none" },
                "& .MuiDataGrid-footerContainer": { borderTop: "1px solid var(--lr-border)" },
                "& .MuiTablePagination-root, & .MuiDataGrid-overlay": { color: "var(--lr-text-secondary)" },
                "& .MuiDataGrid-overlay": { backgroundColor: "transparent" },
                ...sx,
            }}
        />
    );
}
