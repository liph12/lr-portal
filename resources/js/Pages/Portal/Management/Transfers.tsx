import { ReactNode, useState } from "react";
import { SwapHorizRounded } from "@mui/icons-material";
import { GridColDef } from "@mui/x-data-grid";
import ManagementLayout from "../../../components/layouts/ManagementLayout";
import DataTable from "../../../components/utils/tables/DataTable";
import TableToolbar from "../../../components/utils/tables/TableToolbar";
import FilterSelect from "../../../components/utils/tables/FilterSelect";
import PersonCell from "../../../components/utils/tables/PersonCell";
import StatusChip from "../../../components/utils/StatusChip";
import StyledButton from "../../../components/utils/StyledButton";
import TransferDialog from "../../../components/utils/forms/TransferDialog";
import useCan from "../../../hooks/useCan";
import useAuthUser from "../../../hooks/useAuthUser";
import useServerTable, { ServerPage, TableFilters } from "../../../hooks/useServerTable";
import { TeamOption, TransferRow } from "../../../types/app-data-types";
import { formatDate } from "../../../helpers/formatDate";

interface TransfersProps {
    transfers: ServerPage<TransferRow>;
    filters: TableFilters;
    teams: TeamOption[];
}

// Every stint on a team, newest change first: an active row is where the agent is now; an inactive
// one ended on "Left" (moved to another team, or the team was closed).
function Transfers({ transfers, filters, teams }: TransfersProps) {
    const baseUrl = `/${useAuthUser()?.portal ?? "superadmin"}/management`;
    const table = useServerTable("transfers", transfers, filters);
    const [open, setOpen] = useState(false);
    const can = useCan();

    const columns: GridColDef<TransferRow>[] = [
        {
            field: "name",
            headerName: "Agent",
            flex: 1.4,
            minWidth: 220,
            renderCell: ({ row }) => <PersonCell name={row.name} avatar={row.avatar} secondary={`#${row.agent_id}`} />,
        },
        { field: "team_name", headerName: "Team", flex: 1, minWidth: 160 },
        { field: "joined_at", headerName: "Joined", width: 130, valueGetter: (_, row) => (row.joined_at ? formatDate(row.joined_at) : "—") },
        { field: "transferred_at", headerName: "Left", width: 130, valueGetter: (_, row) => (row.transferred_at ? formatDate(row.transferred_at) : "—") },
        { field: "status", headerName: "Status", width: 120, renderCell: ({ row }) => <StatusChip status={row.status === "active" ? "active" : "inactive"} /> },
    ];

    return (
        <>
            <TableToolbar
                search={table.search}
                onSearch={table.setSearch}
                placeholder="Search by agent or team"
                filters={<FilterSelect label="Teams" value={filters.team_id} options={teams.map((t) => ({ value: String(t.id), label: t.name }))} onChange={(v) => table.setFilter("team_id", v)} />}
                action={
                    can("transfer_agents") && (
                        <StyledButton
                            startIcon={<SwapHorizRounded />}
                            variant="contained"
                            onClick={() => setOpen(true)}
                            sx={{ backgroundColor: "var(--lr-primary)", color: "var(--lr-on-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } }}
                        >
                            Transfer an agent
                        </StyledButton>
                    )
                }
            />
            <DataTable {...table.gridProps} columns={columns} getRowHeight={() => 56} aria-label="Team transfers" />
            <TransferDialog open={open} agent={null} teams={teams} baseUrl={baseUrl} onClose={() => setOpen(false)} />
        </>
    );
}

Transfers.layout = (page: ReactNode) => <ManagementLayout children={page} />;

export default Transfers;
