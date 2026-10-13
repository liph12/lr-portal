import { ReactNode, useMemo } from "react";
import { Container, Typography } from "@mui/material";
import { ChevronRightRounded, EmojiEventsRounded } from "@mui/icons-material";
import { GridColDef } from "@mui/x-data-grid";
import { router } from "@inertiajs/react";
import AppLayout from "../../../components/layouts/AppLayout";
import SectionTitle from "../../../components/utils/SectionTitle";
import DataTable from "../../../components/utils/tables/DataTable";
import TableToolbar from "../../../components/utils/tables/TableToolbar";
import PersonCell from "../../../components/utils/tables/PersonCell";
import NatconPeriod, { NatconBoardPeriod, NatconSettings } from "../../../components/natcon/NatconPeriod";
import useServerTable, { ServerPage, TableFilters } from "../../../hooks/useServerTable";
import { formatCount, formatPeso } from "../../../helpers/formatNumber";
import { NatconBoard, NatconGroup } from "./Index";

interface NatconRow {
    rank: number;
    id: number;
    name: string;
    detail: string | null;
    avatar: string | null;
    area: string | null;
    team: string | null;
    value: number;
}

interface NatconShowProps {
    settings: NatconSettings;
    period: NatconBoardPeriod;
    board: NatconBoard;
    group: NatconGroup | null;
    filters: TableFilters;
    rows: ServerPage<NatconRow>;
    canOpen: boolean;
}

// One NATCON board: valid sales reserved in the period and encoded by the cutoff, ranked.
function NatconShow({ settings, period, board, group, filters, rows, canOpen }: NatconShowProps) {
    const table = useServerTable<NatconRow>("rows", rows, filters);
    const people = board.group === "agents";

    const open = (row: NatconRow) => {
        const range = { from: period.from, to: period.to, status: "valid", ...(board.category ? { category: board.category } : {}) };
        if (people) return router.visit(`/agents/${row.id}/sales`, { data: range });
        router.visit("/reports/top-agents", { data: { ...range, ...(board.group === "sub_teams" ? { sub_team_id: row.id } : { team_id: row.id }) } });
    };

    const columns = useMemo<GridColDef<NatconRow>[]>(
        () => [
            {
                field: "rank",
                headerName: "#",
                width: 64,
                sortable: false,
                renderCell: ({ row }) => (
                    <Typography variant="body2" sx={{ fontWeight: row.rank <= 3 ? 700 : 400, color: "var(--lr-text-primary)", display: "flex", alignItems: "center", gap: 0.5, height: "100%" }}>
                        {row.rank <= 3 && <EmojiEventsRounded sx={{ fontSize: 16, color: "var(--lr-primary)" }} aria-hidden />}
                        {row.rank}
                    </Typography>
                ),
            },
            {
                field: "name",
                headerName: people ? "Agent" : board.group === "sub_teams" ? "Sub-team" : "Team",
                flex: 2,
                minWidth: 220,
                sortable: false,
                renderCell: ({ row }) => <PersonCell name={row.name} avatar={row.avatar} secondary={row.detail ?? undefined} />,
            },
            { field: "area", headerName: "Branch", flex: 1, minWidth: 140, sortable: false, valueGetter: (_: unknown, row: NatconRow) => row.area ?? "—" },
            ...(board.group !== "teams" && group?.type !== "team"
                ? [{ field: "team", headerName: "Team", flex: 1, minWidth: 160, sortable: false, valueGetter: (_: unknown, row: NatconRow) => row.team ?? "—" } as GridColDef<NatconRow>]
                : []),
            { field: "value", headerName: "Total sales", type: "number", flex: 1, minWidth: 160, sortable: false, valueFormatter: (v: number) => formatPeso(v) },
            ...(canOpen ? [{ field: "open", headerName: "", width: 56, sortable: false, renderCell: () => <ChevronRightRounded sx={{ color: "var(--lr-text-secondary)", mt: 1.5 }} /> } as GridColDef<NatconRow>] : []),
        ],
        [board.slug, group?.type, canOpen],
    );

    return (
        <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4 } }}>
            <SectionTitle title={board.title} subtitle={group ? `${group.name} — only sales made while on ${group.type === "team" ? "your team" : "your sub-team"}.` : board.description} />
            <NatconPeriod
                period={period}
                title={period.cutoff_month ? "NATCON period" : "Rental period"}
                qualifier={board.slug === "qualifiers" ? settings.qualifier_amount : undefined}
            />

            {board.slug === "qualifiers" && (
                <Typography variant="body2" sx={{ mb: 1.5, color: "var(--lr-text-secondary)" }}>
                    {formatCount(rows.total)} {rows.total === 1 ? "agent" : "agents"} reached {formatPeso(settings.qualifier_amount)} in valid sales — project, brokerage and rental together.
                </Typography>
            )}

            <TableToolbar search={table.search} onSearch={table.setSearch} placeholder={people ? "Search agents" : board.group === "sub_teams" ? "Search sub-teams" : "Search teams"} />
            <DataTable
                {...table.gridProps}
                columns={columns}
                getRowId={(row) => row.id}
                pageSizeOptions={[25, 50, 100]}
                disableColumnMenu
                onRowClick={canOpen ? ({ row }) => open(row as NatconRow) : undefined}
                sx={canOpen ? { "& .MuiDataGrid-row": { cursor: "pointer" } } : undefined}
            />
        </Container>
    );
}

NatconShow.layout = (page: ReactNode) => <AppLayout children={page} />;

export default NatconShow;
