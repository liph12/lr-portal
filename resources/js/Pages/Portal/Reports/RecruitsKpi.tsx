import { ReactNode, useMemo, useState } from "react";
import { Box, Container, Grid, LinearProgress, Typography } from "@mui/material";
import {
    AccountBalanceWalletRounded,
    ArrowBackRounded,
    GroupAddRounded,
    InsightsRounded,
    LocalFireDepartmentRounded,
    OndemandVideoRounded,
    PaymentsRounded,
    TrendingUpRounded,
} from "@mui/icons-material";
import { GridColDef } from "@mui/x-data-grid";
import { Link, router } from "@inertiajs/react";
import AppLayout from "../../../components/layouts/AppLayout";
import SectionTitle from "../../../components/utils/SectionTitle";
import StyledButton from "../../../components/utils/StyledButton";
import StatTile from "../../../components/charts/StatTile";
import DataTable from "../../../components/utils/tables/DataTable";
import TableToolbar from "../../../components/utils/tables/TableToolbar";
import PersonCell from "../../../components/utils/tables/PersonCell";
import DateRangeField from "../../../components/utils/DateRangeField";
import ReportScopeHeader, { ReportScopeDetails } from "../../../components/reports/ReportScopeHeader";
import { reportPresets } from "../../../helpers/dateRanges";
import { formatCount, formatPesoExact } from "../../../helpers/formatNumber";

type Group = "teams" | "sub_teams";

interface KpiRow {
    id: number;
    name: string;
    // A sub-team's unit manager.
    detail: string | null;
    avatar: string | null;
    recruits: number;
    sold: number;
    conversion: number;
    trainees: number;
    nao_finished: number;
    nao: number;
    fire_complete: number;
    fire: number;
    // What the new recruits sold (any date) and the group's whole total in the range; share = the first of the second.
    value: number;
    total_sales: number;
    share: number | null;
}

interface RecruitsKpiProps {
    filters: { from: string; to: string; group: Group };
    // The KPI groupings this reader has (none inside one sub-team).
    groups: Group[];
    scope: ReportScopeDetails | null;
    rows: KpiRow[];
}

const GROUP_LABEL: Record<Group, { tab: string; column: string; total: string }> = {
    teams: { tab: "Teams", column: "Team", total: "Team total sales" },
    sub_teams: { tab: "Sub-teams", column: "Sub-team", total: "Sub-team total sales" },
};

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

function Rate({ value, caption }: { value: number | null; caption?: string }) {
    return (
        // The grid gives a cell its row's height as line height; two lines need their own.
        <Box sx={{ width: "100%", lineHeight: 1.3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <LinearProgress
                    variant="determinate"
                    value={Math.min(value ?? 0, 100)}
                    aria-label={value === null ? "No sales" : `${value}%`}
                    sx={{ flex: 1, height: 6, borderRadius: 99, backgroundColor: "var(--lr-surface-container)", "& .MuiLinearProgress-bar": { borderRadius: 99, backgroundColor: "var(--lr-primary)" } }}
                />
                <Typography variant="caption" sx={{ width: 46, textAlign: "right", fontWeight: 600, color: "var(--lr-text-body)" }}>
                    {value === null ? "—" : `${value}%`}
                </Typography>
            </Box>
            {caption && (
                <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                    {caption}
                </Typography>
            )}
        </Box>
    );
}

// Reports › Recruits KPI: for every team (or sub-team), how its new recruits are doing — sold, NAO, FIRE — and how much of the
// group's whole sales they brought in. A row opens that group in Recruits Progress.
function RecruitsKpi({ filters, groups, scope, rows }: RecruitsKpiProps) {
    const [search, setSearch] = useState("");
    const label = GROUP_LABEL[filters.group];

    const visit = (changes: Partial<RecruitsKpiProps["filters"]>) => router.get("/reports/recruits-kpi", { ...filters, ...changes }, { preserveState: true, preserveScroll: true });

    const shown = useMemo(() => {
        const q = search.trim().toLowerCase();
        return q ? rows.filter((r) => r.name.toLowerCase().includes(q) || (r.detail ?? "").toLowerCase().includes(q)) : rows;
    }, [rows, search]);

    // The KPIs over every row shown.
    const t = useMemo(
        () =>
            shown.reduce(
                (s, r) => ({ recruits: s.recruits + r.recruits, sold: s.sold + r.sold, trainees: s.trainees + r.trainees, nao: s.nao + r.nao_finished, fire: s.fire + r.fire_complete, value: s.value + r.value, total: s.total + r.total_sales }),
                { recruits: 0, sold: 0, trainees: 0, nao: 0, fire: 0, value: 0, total: 0 },
            ),
        [shown],
    );

    const columns = useMemo<GridColDef<KpiRow>[]>(
        () => [
            {
                field: "name",
                headerName: label.column,
                flex: 1.4,
                minWidth: 220,
                hideable: false,
                renderCell: ({ row }) => <PersonCell name={row.name} avatar={row.avatar} secondary={row.detail ?? undefined} hideAvatar={filters.group === "teams"} />,
            },
            { field: "share", headerName: "KPI: new recruits' share", width: 190, sortComparator: (a: number | null, b: number | null) => (a ?? -1) - (b ?? -1), renderCell: ({ row }) => <Rate value={row.share} /> },
            { field: "total_sales", headerName: label.total, type: "number", flex: 1, minWidth: 180, valueFormatter: (v: number) => formatPesoExact(v) },
            { field: "value", headerName: "New recruits' sales", type: "number", flex: 1, minWidth: 170, valueFormatter: (v: number) => formatPesoExact(v) },
            { field: "recruits", headerName: "New recruits", type: "number", width: 120, valueFormatter: (v: number) => formatCount(v) },
            { field: "conversion", headerName: "Sold", width: 170, renderCell: ({ row }) => <Rate value={row.conversion} caption={`${formatCount(row.sold)} of ${formatCount(row.recruits)}`} /> },
            { field: "nao", headerName: "NAO finished", width: 170, renderCell: ({ row }) => <Rate value={row.nao} caption={`${formatCount(row.nao_finished)} of ${formatCount(row.trainees)} in training`} /> },
            { field: "fire", headerName: "FIRE complete", width: 170, renderCell: ({ row }) => <Rate value={row.fire} caption={`${formatCount(row.fire_complete)} of ${formatCount(row.trainees)} in training`} /> },
        ],
        [filters.group, label],
    );

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 3, sm: 4 } }}>
            <Link href="/reports" style={{ textDecoration: "none" }}>
                <StyledButton size="small" variant="text" startIcon={<ArrowBackRounded />} sx={{ mb: 1, px: 1, color: "var(--lr-primary)" }}>
                    All reports
                </StyledButton>
            </Link>
            <SectionTitle title="Recruits KPI" subtitle="Per team and sub-team: new recruits' sales, conversion, NAO and FIRE — against the group's total sales." />
            {scope && <ReportScopeHeader scope={scope} total={0} hideTotal />}

            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, mb: 3 }}>
                <DateRangeField label="Signed up" value={{ from: filters.from, to: filters.to }} presets={reportPresets()} onChange={(range) => visit(range)} />
                {groups.length > 1 && (
                    <Box component="nav" aria-label="Group by" sx={{ display: "flex", gap: 1 }}>
                        {groups.map((g) => (
                            <StyledButton
                                key={g}
                                size="small"
                                onClick={() => visit({ group: g })}
                                aria-current={g === filters.group ? "page" : undefined}
                                sx={{ px: 2, borderRadius: 99, fontWeight: g === filters.group ? 700 : 500, color: g === filters.group ? "var(--lr-primary)" : "var(--lr-text-body)", backgroundColor: g === filters.group ? "var(--lr-primary-soft)" : "var(--lr-surface)", border: "1px solid var(--lr-border)" }}
                            >
                                {GROUP_LABEL[g].tab}
                            </StyledButton>
                        ))}
                    </Box>
                )}
            </Box>

            {groups.length === 0 ? (
                <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                    The KPI compares teams or sub-teams; inside one sub-team there's nothing to compare. Recruits Progress shows its recruits.
                </Typography>
            ) : (
                <>
                    {/* The KPIs over the rows shown. */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                            <StatTile icon={GroupAddRounded} label="New recruits" value={formatCount(t.recruits)} caption={`Signed up in the range, ${formatCount(shown.length)} ${label.tab.toLowerCase()}`} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                            <StatTile icon={TrendingUpRounded} label="Sold" value={`${pct(t.sold, t.recruits)}%`} caption={`${formatCount(t.sold)} new recruits with a sale`} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                            <StatTile icon={OndemandVideoRounded} label="NAO finished" value={`${pct(t.nao, t.trainees)}%`} caption={`${formatCount(t.nao)} of ${formatCount(t.trainees)} still in training`} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                            <StatTile icon={LocalFireDepartmentRounded} label="FIRE complete" value={`${pct(t.fire, t.trainees)}%`} caption={`${formatCount(t.fire)} of ${formatCount(t.trainees)} still in training`} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <StatTile icon={AccountBalanceWalletRounded} label={label.total} value={formatPesoExact(t.total)} caption="All members' valid sales in the range" />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <StatTile icon={PaymentsRounded} label="New recruits' sales" value={formatPesoExact(t.value)} caption="Their valid sales, any date" />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <StatTile icon={InsightsRounded} label="KPI: new recruits' share" value={t.total > 0 ? `${pct(t.value, t.total)}%` : "—"} caption="New recruits' sales ÷ total sales" />
                        </Grid>
                    </Grid>

                    <TableToolbar
                        search={search}
                        onSearch={setSearch}
                        placeholder={filters.group === "teams" ? "Search teams" : "Search sub-teams or unit managers"}
                    />
                    <DataTable
                        rows={shown}
                        columns={columns}
                        getRowId={(r) => r.id}
                        rowNumbers={!search.trim()}
                        // Its column choice, kept from before every table had a Columns button.
                        columnsKey="lr-recruits-kpi-columns"
                        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                        getRowHeight={() => 64}
                        onRowClick={({ row }) => router.visit("/reports/recruits-progress", { data: { from: filters.from, to: filters.to, [filters.group === "teams" ? "team_id" : "sub_team_id"]: (row as KpiRow).id } })}
                        sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
                        aria-label="Recruits KPI"
                    />
                </>
            )}
        </Container>
    );
}

RecruitsKpi.layout = (page: ReactNode) => <AppLayout children={page} />;

export default RecruitsKpi;
