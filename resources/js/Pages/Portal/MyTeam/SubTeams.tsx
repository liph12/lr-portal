import { ReactNode, useMemo, useState } from "react";
import { Box, Container, LinearProgress, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import { router } from "@inertiajs/react";
import AppLayout from "../../../components/layouts/AppLayout";
import SectionTitle from "../../../components/utils/SectionTitle";
import StatusChip from "../../../components/utils/StatusChip";
import DataTable from "../../../components/utils/tables/DataTable";
import TableToolbar from "../../../components/utils/tables/TableToolbar";
import DateRangeField from "../../../components/utils/DateRangeField";
import { reportPresets } from "../../../helpers/dateRanges";
import { formatPeso, formatPesoCompact } from "../../../helpers/formatNumber";
import PersonCell from "../../../components/utils/tables/PersonCell";
import MyTeamNav, { MyTeamGroup } from "../../../components/myteam/MyTeamNav";

interface SubTeamRow {
    id: number;
    name: string;
    logo: string | null;
    status: string;
    agent_id: number;
    leader_name: string | null;
    leader_avatar: string | null;
    members_count: number;
    // Members' sales credited to the sub-team for the chosen dates, and the unit manager's own sales.
    sales: number;
    leader_sales: number;
}

interface SubTeamsProps {
    group: MyTeamGroup;
    isTeam: boolean;
    subTeams: SubTeamRow[];
    filters: { from: string; to: string; status: string };
}

type Rank = "sub_teams" | "unit_managers";

// My Team › Sub-teams (team leaders): the team's sub-teams and unit managers ranked by sales — to look at. Creating and
// editing sub-teams is Management's (superadmin / admin).
function SubTeams({ group, isTeam, subTeams, filters }: SubTeamsProps) {
    const [search, setSearch] = useState("");
    const [rank, setRank] = useState<Rank>("sub_teams");
    const [loading, setLoading] = useState(false);

    // Ranked by the chosen measure, highest first; search narrows by sub-team or unit manager.
    const rows = useMemo(() => {
        const term = search.trim().toLowerCase();
        const key = rank === "sub_teams" ? "sales" : "leader_sales";
        return subTeams
            .filter((s) => !term || s.name.toLowerCase().includes(term) || (s.leader_name ?? "").toLowerCase().includes(term))
            .slice()
            .sort((a, b) => b[key] - a[key]);
    }, [subTeams, search, rank]);

    const changeRange = (range: { from: string; to: string }) =>
        router.get("/my-team/sub-teams", { team: group.id, ...range }, {
            only: ["subTeams", "filters"],
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });

    const subTeamColumn: GridColDef<SubTeamRow> = { field: "name", headerName: "Sub-team", flex: 1.3, minWidth: 200, renderCell: ({ row }) => <PersonCell name={row.name} avatar={row.logo} /> };
    const managerColumn: GridColDef<SubTeamRow> = { field: "leader_name", headerName: "Unit manager", flex: 1.2, minWidth: 200, renderCell: ({ row }) => <PersonCell name={row.leader_name} avatar={row.leader_avatar} /> };
    const columns: GridColDef<SubTeamRow>[] = [
        { field: "rank", headerName: "#", width: 56, sortable: false, valueGetter: (_, row) => rows.indexOf(row) + 1 },
        ...(rank === "sub_teams" ? [subTeamColumn, managerColumn] : [managerColumn, subTeamColumn]),
        {
            field: rank === "sub_teams" ? "sales" : "leader_sales",
            headerName: rank === "sub_teams" ? "Sub-team sales" : "Unit manager's own sales",
            type: "number",
            flex: 1,
            minWidth: 180,
            valueFormatter: (v: number) => formatPeso(v),
        },
        {
            field: rank === "sub_teams" ? "leader_sales" : "sales",
            headerName: rank === "sub_teams" ? "Unit manager's own" : "Sub-team sales",
            type: "number",
            width: 170,
            valueFormatter: (v: number) => formatPesoCompact(v),
        },
        { field: "members_count", headerName: "Members", type: "number", width: 110 },
        { field: "status", headerName: "Status", width: 130, renderCell: ({ row }) => <StatusChip status={row.status} /> },
    ];

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 3, sm: 4 } }}>
            <SectionTitle title={`My Team · ${group.name}`} subtitle="Sub-teams and their unit managers." />
            <MyTeamNav group={group} isTeam={isTeam} />
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, mb: 2 }}>
                <DateRangeField value={{ from: filters.from, to: filters.to }} presets={reportPresets()} onChange={changeRange} />
                <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={rank}
                    onChange={(_, v: Rank | null) => v && setRank(v)}
                    aria-label="Rank by"
                    sx={{ "& .MuiToggleButton-root": { textTransform: "none", px: 2, borderRadius: 99 }, "& .Mui-selected": { color: "var(--lr-primary) !important", backgroundColor: "var(--lr-primary-soft) !important" } }}
                >
                    <ToggleButton value="sub_teams">Top sub-teams</ToggleButton>
                    <ToggleButton value="unit_managers">Top unit managers</ToggleButton>
                </ToggleButtonGroup>
            </Box>
            {loading && <LinearProgress sx={{ height: 2, mb: 2 }} />}
            <Typography variant="body2" sx={{ mb: 1, color: "var(--lr-text-secondary)" }}>
                {rank === "sub_teams"
                    ? "Sub-team sales: members' valid sales, credited to the sub-team they were on at each reservation date."
                    : "A unit manager's own valid sales within your team."}{" "}
                Click a sub-team to see its members and sales.
            </Typography>
            <TableToolbar search={search} onSearch={setSearch} placeholder="Search sub-teams or unit managers" />
            <DataTable
                rows={rows}
                columns={columns}
                initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                getRowHeight={() => 60}
                onRowClick={({ row }) => router.visit(`/my-team?sub_team=${row.id}`)}
                sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
                aria-label="Sub-teams"
            />
        </Container>
    );
}

SubTeams.layout = (page: ReactNode) => <AppLayout children={page} />;

export default SubTeams;
