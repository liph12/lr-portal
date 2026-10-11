import { Box, Drawer, IconButton, Typography } from "@mui/material";
import { CloseRounded } from "@mui/icons-material";
import { router } from "@inertiajs/react";
import { GridColDef } from "@mui/x-data-grid";
import SaleDetailsView from "../sales/SaleDetailsView";
import { SaleDetail } from "../sales/SaleDetailsForm";
import DataTable from "../utils/tables/DataTable";
import TableToolbar from "../utils/tables/TableToolbar";
import PersonCell from "../utils/tables/PersonCell";
import StatusChip from "../utils/StatusChip";
import useServerTable, { ServerPage, TableFilters } from "../../hooks/useServerTable";
import { formatDate } from "../../helpers/formatDate";
import { formatPeso } from "../../helpers/formatNumber";

export interface ReportSaleRow {
    id: number;
    category: string;
    brokerage_area: string | null;
    agent_id: number | null;
    agent_name: string | null;
    agent_avatar: string | null;
    client_first_name: string | null;
    client_last_name: string | null;
    project_name: string | null;
    unit_number: string | null;
    value: number;
    reservation_date: string | null;
    created_at: string | null;
    sale_status: string;
}

const STATUS_LABELS: Record<string, string> = { pending: "Pending", valid: "Validated", invalid: "Invalid", cancelled: "Cancelled" };

// The sales behind a report one by one (inside a developer): read-only — validation happens in Sales validation.
const CATEGORY_LABELS: Record<string, string> = { project: "Project", rental: "Rental", brokerage: "Brokerage" };

interface ReportSaleListProps {
    sales: ServerPage<ReportSaleRow>;
    filters: TableFilters;
    detail: SaleDetail | null;
    // My Sales: it's always the reader, so no agent column; any category, so a type column.
    showAgent?: boolean;
    showCategory?: boolean;
}

export default function ReportSaleList({ sales, filters, detail, showAgent = true, showCategory = false }: ReportSaleListProps) {
    const table = useServerTable("saleList", sales, filters);

    // A clicked sale opens read-only by ?sale=ID (a partial reload of one prop), so the panel survives a refresh.
    const showSale = (id: number | null) => {
        const query = Object.fromEntries(new URLSearchParams(window.location.search));
        delete query.sale;
        if (id) query.sale = String(id);
        router.get(window.location.pathname, query, { only: ["saleDetail"], preserveState: true, preserveScroll: true, replace: true });
    };

    const columns: GridColDef<ReportSaleRow>[] = [
        ...(showAgent
            ? [{ field: "agent", headerName: "Agent", flex: 1.2, minWidth: 190, sortable: false, renderCell: ({ row }) => <PersonCell name={row.agent_name ?? "No agent"} avatar={row.agent_avatar} /> } as GridColDef<ReportSaleRow>]
            : []),
        {
            field: "client",
            headerName: "Client",
            flex: 1.2,
            minWidth: 190,
            sortable: false,
            valueGetter: (_, row) => [row.client_first_name, row.client_last_name].filter(Boolean).join(" ") || "No client name",
        },
        ...(showCategory
            ? [{ field: "category", headerName: "Type", width: 110, sortable: false, valueGetter: (_, row) => CATEGORY_LABELS[row.category] ?? row.category } as GridColDef<ReportSaleRow>]
            : []),
        {
            field: "project_name",
            headerName: showCategory ? "Project / property" : "Project",
            flex: 1,
            minWidth: 170,
            sortable: false,
            valueGetter: (_, row) => row.project_name ?? row.brokerage_area ?? (row.category === "rental" ? "Rental" : "—"),
        },
        { field: "unit_number", headerName: "Unit", width: 120, sortable: false, valueGetter: (_, row) => row.unit_number ?? "—" },
        { field: "value", headerName: "Contract price", width: 150, sortable: false, renderCell: ({ row }) => formatPeso(row.value) },
        { field: "reservation_date", headerName: "Reserved", width: 120, sortable: false, valueGetter: (_, row) => (row.reservation_date ? formatDate(row.reservation_date) : "—") },
        { field: "created_at", headerName: "Date added", width: 120, sortable: false, valueGetter: (_, row) => (row.created_at ? formatDate(row.created_at) : "—") },
        {
            field: "sale_status",
            headerName: "Status",
            width: 130,
            sortable: false,
            renderCell: ({ row }) => <StatusChip status={row.sale_status}>{STATUS_LABELS[row.sale_status] ?? row.sale_status}</StatusChip>,
        },
    ];

    return (
        <>
            <TableToolbar search={table.search} onSearch={table.setSearch} placeholder="Search agent, client, project or unit" />
            <DataTable
                {...table.gridProps}
                columns={columns}
                getRowHeight={() => 56}
                onRowClick={({ row }) => showSale(row.id)}
                aria-label="Sales, one by one — click one for its details"
                sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
            />
            <Drawer anchor="right" open={!!detail} onClose={() => showSale(null)} slotProps={{ paper: { sx: { width: { xs: "100%", md: 640 }, backgroundColor: "var(--lr-surface)" } } }}>
                {detail && (
                    <Box sx={{ p: { xs: 2, sm: 3 } }}>
                        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                            <Typography variant="h6" sx={{ flex: 1, fontSize: 18, color: "var(--lr-text-primary)" }}>
                                Sale to {[detail.client.client_first_name, detail.client.client_last_name].filter(Boolean).join(" ") || "an unnamed client"}
                            </Typography>
                            <IconButton aria-label="Close" onClick={() => showSale(null)}>
                                <CloseRounded />
                            </IconButton>
                        </Box>
                        <SaleDetailsView detail={detail} />
                    </Box>
                )}
            </Drawer>
        </>
    );
}
