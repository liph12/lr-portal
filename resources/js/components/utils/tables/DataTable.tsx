import { DataGrid, DataGridProps, GridValidRowModel } from "@mui/x-data-grid";

// The app's table: MUI X DataGrid themed with the --lr-* tokens (so it follows dark mode). Grows with
// its rows (autoHeight) so AppLayout's <main> stays the only scroller. Spread props; caller sx last.
export default function DataTable<R extends GridValidRowModel>({ sx, ...props }: DataGridProps<R>) {
    return (
        <DataGrid
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
