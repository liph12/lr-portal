import { useMemo } from "react";
import { DataGrid, DataGridProps, GridColDef, GridRenderCellParams, GridValidRowModel } from "@mui/x-data-grid";

interface DataTableProps<R extends GridValidRowModel> extends DataGridProps<R> {
    // A "#" column numbering the rows 1…N, page after page (rankings read as positions). Off while searching (a search's
    // matches aren't positions — useServerTable turns it off then) and for tables with a rank column of their own.
    rowNumbers?: boolean;
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

// The app's table: MUI X DataGrid themed with the --lr-* tokens (so it follows dark mode). Grows with
// its rows (autoHeight) so AppLayout's <main> stays the only scroller. Spread props; caller sx last.
export default function DataTable<R extends GridValidRowModel>({ sx, rowNumbers = true, columns, ...props }: DataTableProps<R>) {
    const shown = useMemo(() => (rowNumbers ? [NUMBER_COLUMN as GridColDef<R>, ...columns] : columns), [rowNumbers, columns]);

    return (
        <DataGrid
            columns={shown}
            autoHeight
            density="comfortable"
            disableRowSelectionOnClick
            disableColumnMenu
            pageSizeOptions={[25, 50, 100]}
            {...props}
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
