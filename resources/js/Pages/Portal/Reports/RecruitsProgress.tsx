import { ReactNode } from "react";
import { Box, Container, Grid, LinearProgress, Typography } from "@mui/material";
import { ArrowBackRounded } from "@mui/icons-material";
import { GridColDef } from "@mui/x-data-grid";
import { Link } from "@inertiajs/react";
import AppLayout from "../../../components/layouts/AppLayout";
import SectionTitle from "../../../components/utils/SectionTitle";
import SectionCard from "../../../components/cards/SectionCard";
import StyledButton from "../../../components/utils/StyledButton";
import BarList from "../../../components/charts/BarList";
import MonthlyColumnChart from "../../../components/charts/MonthlyColumnChart";
import DataTable from "../../../components/utils/tables/DataTable";
import TableToolbar from "../../../components/utils/tables/TableToolbar";
import PersonCell from "../../../components/utils/tables/PersonCell";
import DateRangeField from "../../../components/utils/DateRangeField";
import ReportScopeHeader, { ReportScopeDetails } from "../../../components/reports/ReportScopeHeader";
import RecruitsPanel, { StatusBuckets } from "../../../components/recruitment/RecruitsPanel";
import useServerTable, { ServerPage, TableFilters } from "../../../hooks/useServerTable";
import { reportPresets } from "../../../helpers/dateRanges";
import { formatCount, formatPeso } from "../../../helpers/formatNumber";
import { formatDate } from "../../../helpers/formatDate";

interface Measures {
    nao_status: StatusBuckets;
    fire_status: StatusBuckets;
    overall_status: StatusBuckets;
    recruits: number;
    sold: number;
    conversion: number;
    value: number;
    trainees: number;
    nao_finished: number;
    nao: number;
    fire_complete: number;
    fire: number;
}

interface ProgressRow extends Measures {
    id: number | string;
    name: string;
    detail: string | null;
    avatar: string | null;
    // The sponsor's current team (By agent tab).
    team: string | null;
}

type Group = "teams" | "sub_teams" | "areas" | "sponsors" | "recruits";

// The Recruits tab: one recruit per row.
interface RecruitRow {
    id: number;
    name: string;
    detail: string | null;
    avatar: string | null;
    sponsor: string | null;
    team: string | null;
    sub_team: string | null;
    area: string | null;
    signed_up: string;
    sold: boolean;
    value: number;
    nao: number;
    fire: number;
}

interface RecruitsProgressProps {
    filters: TableFilters & { from: string; to: string; group: Group; team_id?: number; sub_team_id?: number; sponsor_id?: number; area?: string };
    // Empty once narrowed to one sponsor: there's nothing below them to group by.
    groups: Group[];
    scope: ReportScopeDetails | null;
    // The team / sub-team / sponsor clicked into, if any.
    selection: (Omit<ReportScopeDetails, "type"> & { type: "team" | "sub_team" | "area" | "sponsor" | "agent" }) | null;
    summary: { kpis: Measures; areas: (Measures & { area: string | null; name: string })[]; trend: { month: string; sales: number; value: number }[] };
    rows: ServerPage<ProgressRow>;
}

const GROUP_LABELS: Record<Group, { tab: string; column: string; search: string }> = {
    teams: { tab: "By team", column: "Team", search: "Search teams" },
    sub_teams: { tab: "By unit manager", column: "Sub-team / unit manager", search: "Search sub-teams or unit managers" },
    areas: { tab: "By branch", column: "Branch", search: "Search branches" },
    sponsors: { tab: "By agent (sponsor)", column: "Sponsor / upline", search: "Search sponsors" },
    recruits: { tab: "Recruits", column: "Recruit", search: "Search recruits" },
};

const CHART_LABELS = {
    value: "Recruits' total sales",
    count: "Recruits",
    valueToggle: "Their sales",
    countToggle: "Recruits",
    dated: "by sign-up month",
};

function Percent({ value, caption }: { value: number; caption: string }) {
    return (
        <Box sx={{ width: "100%" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <LinearProgress
                    variant="determinate"
                    value={Math.min(value, 100)}
                    aria-label={`${value}%`}
                    sx={{ flex: 1, height: 6, borderRadius: 99, backgroundColor: "var(--lr-surface-container)", "& .MuiLinearProgress-bar": { borderRadius: 99, backgroundColor: "var(--lr-primary)" } }}
                />
                <Typography variant="caption" sx={{ width: 44, textAlign: "right", color: "var(--lr-text-body)" }}>
                    {value}%
                </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                {caption}
            </Typography>
        </Box>
    );
}

// Reports › Recruits Progress: how recruits are converting into sellers, and how far the rest are with NAO / FIRE.
function RecruitsProgress({ filters, groups, scope, selection, summary, rows }: RecruitsProgressProps) {
    // The header (selection) and the tabs (groups) change with a drill-down, so they reload with the table.
    const table = useServerTable("rows", rows, filters, ["summary", "selection", "groups"]);
    const { kpis } = summary;
    const label = GROUP_LABELS[filters.group];
    const selected = { team_id: filters.team_id, sub_team_id: filters.sub_team_id, sponsor_id: filters.sponsor_id, area: filters.area };
    const viewQuery = new URLSearchParams(
        Object.entries({ from: filters.from, to: filters.to, ...selected }).filter(([, v]) => v !== undefined && v !== null && v !== "") as [string, string][],
    ).toString();

    // Clicking a row narrows the page to that group; the table then goes one level down.
    const open = (row: ProgressRow) => {
        if (!row.id) return;
        // A sponsor or a recruit is a person: their own recruits (a team leader's team, a unit manager's sub-team), replacing the last pick.
        if (filters.group === "sponsors" || filters.group === "recruits") {
            table.drillInto({ person: row.id, team_id: "", sub_team_id: "", sponsor_id: "", area: "", group: "", sort: "", dir: "", q: "" });
            return;
        }
        const key = { teams: "team_id", sub_teams: "sub_team_id", areas: "area" }[filters.group];
        table.drillInto({ [key]: row.id, group: "", sort: "", dir: "", q: "" });
    };

    // The people themselves: who brought them in, where they are, and how far they got.
    const recruitColumns: GridColDef<RecruitRow>[] = [
        { field: "name", headerName: "Recruit", flex: 1.5, minWidth: 240, renderCell: ({ row }) => <PersonCell name={row.name} avatar={row.avatar} secondary={row.detail ?? undefined} /> },
        { field: "sponsor", headerName: "Sponsor / upline", flex: 1.1, minWidth: 180, sortable: false, valueGetter: (_: unknown, r: RecruitRow) => r.sponsor ?? "—" },
        {
            field: "team",
            headerName: "Team / sub-team",
            flex: 1.1,
            minWidth: 180,
            sortable: false,
            renderCell: ({ row }) => <PersonCell hideAvatar name={row.team ?? "—"} secondary={row.sub_team ?? undefined} />,
        },
        { field: "signed_up", headerName: "Signed up", width: 120, valueGetter: (_: unknown, r: RecruitRow) => formatDate(r.signed_up) },
        {
            field: "value",
            headerName: "Sales",
            width: 150,
            renderCell: ({ row }) => <PersonCell hideAvatar name={row.sold ? formatPeso(row.value) : "No sale yet"} secondary={row.sold ? "Valid sales, any date" : "In training"} />,
        },
        { field: "nao", headerName: "NAO", width: 150, renderCell: ({ row }) => <Percent value={row.nao} caption={row.nao >= 100 ? "Finished" : row.nao > 0 ? "On progress" : "Not yet started"} /> },
        {
            field: "fire",
            headerName: "FIRE",
            width: 150,
            renderCell: ({ row }) => <Percent value={Math.min(100, Math.round((row.fire / 3) * 100))} caption={`${Math.min(row.fire, 3)} of 3 certificates`} />,
        },
    ];

    const columns: GridColDef<ProgressRow>[] = [
        {
            field: "name",
            headerName: label.column,
            flex: 1.5,
            minWidth: 240,
            renderCell: ({ row }) => <PersonCell name={row.name} avatar={row.avatar} secondary={row.detail ?? undefined} hideAvatar={filters.group === "teams" || filters.group === "areas"} />,
        },
        ...(filters.group === "sponsors"
            ? [{ field: "team", headerName: "Team", flex: 1, minWidth: 150, sortable: false, valueGetter: (_: unknown, r: ProgressRow) => r.team ?? "—" } as GridColDef<ProgressRow>]
            : []),
        { field: "recruits", headerName: "Recruits", type: "number", width: 110, valueFormatter: (v: number) => formatCount(v) },
        {
            field: "conversion",
            headerName: "Recruits who sold",
            width: 180,
            renderCell: ({ row }) => <Percent value={row.conversion} caption={`${formatCount(row.sold)} of ${formatCount(row.recruits)}`} />,
        },
        { field: "nao", headerName: "NAO finished", width: 170, renderCell: ({ row }) => <Percent value={row.nao} caption={`${formatCount(row.nao_finished)} of ${formatCount(row.trainees)} in training`} /> },
        { field: "fire", headerName: "FIRE complete (3 of 3)", width: 190, renderCell: ({ row }) => <Percent value={row.fire} caption={`${formatCount(row.fire_complete)} of ${formatCount(row.trainees)} in training`} /> },
        { field: "value", headerName: "Recruits' total sales", type: "number", flex: 1, minWidth: 170, valueFormatter: (v: number) => formatPeso(v) },
    ];

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 3, sm: 4 } }}>
            <Link href="/reports" style={{ textDecoration: "none" }}>
                <StyledButton size="small" variant="text" startIcon={<ArrowBackRounded />} sx={{ mb: 1, px: 1, color: "var(--lr-primary)" }}>
                    All reports
                </StyledButton>
            </Link>
            <SectionTitle
                title="Recruits Progress"
                subtitle="Members who signed up in the range: how many have sold, their sales, and NAO / FIRE for the ones still in training."
            />
            {selection ? (
                <ReportScopeHeader
                    scope={{ ...selection, type: selection.type === "sponsor" ? "agent" : selection.type }}
                    typeLabel={selection.type === "sponsor" ? "Sponsor / upline" : undefined}
                    total={0}
                    hideTotal
                    onClear={() => table.drillInto({ team_id: "", sub_team_id: "", sponsor_id: "", area: "", group: "" })}
                />
            ) : (
                scope && <ReportScopeHeader scope={scope} total={0} hideTotal />
            )}

            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, mb: 3 }}>
                <DateRangeField label="Signed up" value={{ from: filters.from, to: filters.to }} presets={reportPresets()} onChange={(range) => table.setFilters({ ...range })} />
            </Box>
            {table.loading && <LinearProgress sx={{ height: 2, mb: 2 }} />}

            {/* KPIs */}
            <RecruitsPanel
                area={scope?.type === "area" ? scope.name : selection?.type === "area" ? selection.name : null}
                recruits={kpis.recruits}
                trainees={kpis.trainees}
                sold={kpis.sold}
                conversion={kpis.conversion}
                value={kpis.value}
                from={filters.from}
                to={filters.to}
                fire={kpis.fire_status}
                nao={kpis.nao_status}
                overall={kpis.overall_status}
                viewHref={`/reports/recruits?${viewQuery}`}
            />

            {/* Table */}
            {groups.length > 1 && (
                <Box component="nav" aria-label="Group recruits by" sx={{ display: "flex", gap: 1, mb: 2, overflowX: "auto", scrollbarWidth: "none" }}>
                    {groups.map((g) => {
                        const active = g === filters.group;
                        return (
                            <StyledButton
                                key={g}
                                size="small"
                                variant="text"
                                aria-pressed={active}
                                onClick={() => table.setFilters({ group: g, sort: "", dir: "" })}
                                sx={{
                                    borderRadius: 99,
                                    px: 2,
                                    fontWeight: 500,
                                    whiteSpace: "nowrap",
                                    color: active ? "var(--lr-primary)" : "var(--lr-text-secondary)",
                                    backgroundColor: active ? "var(--lr-primary-soft)" : "transparent",
                                    ":hover": { backgroundColor: active ? "var(--lr-primary-soft)" : "var(--lr-surface-container)" },
                                }}
                            >
                                {GROUP_LABELS[g].tab}
                            </StyledButton>
                        );
                    })}
                </Box>
            )}
            {groups.length > 0 ? (
                <>
                    <Typography variant="body2" sx={{ mb: 1, color: "var(--lr-text-secondary)" }}>
                        Click a row to see its own recruits panel and KPIs.
                    </Typography>
                    <TableToolbar search={table.search} onSearch={table.setSearch} placeholder={label.search} />
                    <DataTable
                        {...(table.gridProps as never)}
                        columns={(filters.group === "recruits" ? recruitColumns : columns) as never}
                        getRowHeight={() => 68}
                        onRowClick={({ row }) => open(row as ProgressRow)}
                        sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
                        aria-label={`Recruits progress ${label.tab.toLowerCase()}`}
                    />
                </>
            ) : (
                <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                    These are one sponsor's recruits. Use View in the panel to see them one by one.
                </Typography>
            )}

            {/* Statistics */}
            <Box sx={{ mt: 5 }}>
                <SectionTitle title="Statistics" subtitle="For the same recruits." />
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, lg: 5 }}>
                        <SectionCard title="Top branches">
                            <BarList
                                items={summary.areas.map((a) => ({ name: a.name, value: a.recruits, detail: `${a.conversion}% sold · NAO ${a.nao}% · FIRE ${a.fire}%` }))}
                                caption="Recruits by the area they belong to, with how many sold and their NAO / FIRE completion"
                                formatValue={formatCount}
                                emptyText="No recruits in this range."
                            />
                        </SectionCard>
                    </Grid>
                    <Grid size={{ xs: 12, lg: 7 }}>
                        <SectionCard title="Sign-ups over time">
                            <MonthlyColumnChart data={summary.trend} labels={CHART_LABELS} />
                        </SectionCard>
                    </Grid>
                </Grid>
            </Box>
        </Container>
    );
}

RecruitsProgress.layout = (page: ReactNode) => <AppLayout children={page} />;

export default RecruitsProgress;
