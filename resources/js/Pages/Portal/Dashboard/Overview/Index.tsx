import { ReactNode, useState } from "react";
import { Box, Container, Grid, LinearProgress } from "@mui/material";
import { ArrowForwardRounded } from "@mui/icons-material";
import { Link, router } from "@inertiajs/react";
import DashboardLayout from "../../../../components/layouts/DashboardLayout";
import SectionTitle from "../../../../components/utils/SectionTitle";
import SectionCard from "../../../../components/cards/SectionCard";
import StyledButton from "../../../../components/utils/StyledButton";
import BarList from "../../../../components/charts/BarList";
import DateRangeField from "../../../../components/utils/DateRangeField";
import ReportStatistics, { ReportSummary } from "../../../../components/reports/ReportStatistics";
import ReportScopeHeader, { ReportScopeDetails } from "../../../../components/reports/ReportScopeHeader";
import { reportPresets } from "../../../../helpers/dateRanges";
import { formatPesoCompact } from "../../../../helpers/formatNumber";

interface RankedRow {
    id: number | string;
    name: string;
    value: number;
    team: string | null;
    area: string | null;
}

interface OverviewProps {
    filters: { from: string; to: string };
    scope: ReportScopeDetails | null;
    summary: ReportSummary;
    topAgents: RankedRow[];
    // Teams for the back office, sub-teams for a team leader, nothing for a unit manager.
    topGroups: { view: "teams" | "sub_teams"; rows: RankedRow[] } | null;
}

function ViewAll({ href }: { href: string }) {
    return (
        <Link href={href} style={{ textDecoration: "none" }}>
            <StyledButton size="small" variant="text" endIcon={<ArrowForwardRounded />} sx={{ mt: 1, px: 1, color: "var(--lr-primary)" }}>
                View all
            </StyledButton>
        </Link>
    );
}

// Dashboard › Overview: sales at a glance — the whole system for the back office, a team leader's team or a unit
// manager's sub-team otherwise (decided on the server). Members and recruits live under Reports › Recruits.
function Overview({ filters, scope, summary, topAgents, topGroups }: OverviewProps) {
    const [loading, setLoading] = useState(false);
    const query = `from=${filters.from}&to=${filters.to}`;

    const changeRange = (range: { from: string; to: string }) =>
        router.get("/dashboard/overview", range, {
            only: ["filters", "scope", "summary", "topAgents", "topGroups"],
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 3, sm: 4 } }}>
            <SectionTitle title="Overview" subtitle={scope ? "Your team's sales at a glance." : "Sales across the whole system at a glance."} />
            {scope && <ReportScopeHeader scope={scope} total={summary.kpis.value.value} />}

            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, mb: 3 }}>
                <DateRangeField value={filters} presets={reportPresets()} onChange={changeRange} />
            </Box>
            {loading && <LinearProgress sx={{ height: 2, mb: 2 }} />}

            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, lg: topGroups ? 6 : 12 }}>
                    <SectionCard title="Top agents">
                        <BarList
                            items={topAgents.map((a) => ({ name: a.name, value: a.value, detail: [a.team, a.area].filter(Boolean).join(" · ") || undefined, href: a.id ? `/agents/${a.id}/sales?${query}` : undefined }))}
                            caption="Top 5 agents by total sales"
                            formatValue={formatPesoCompact}
                            emptyText="No sales in this range."
                        />
                        <ViewAll href={`/dashboard/view-sales?view=agents&${query}`} />
                    </SectionCard>
                </Grid>
                {topGroups && (
                    <Grid size={{ xs: 12, lg: 6 }}>
                        <SectionCard title={topGroups.view === "teams" ? "Top teams" : "Top sub-teams"}>
                            <BarList
                                items={topGroups.rows.map((g) => ({ name: g.name, value: g.value, detail: g.area ?? undefined }))}
                                caption={`Top 5 ${topGroups.view === "teams" ? "teams" : "sub-teams"} by total sales`}
                                formatValue={formatPesoCompact}
                                emptyText="No sales in this range."
                            />
                            <ViewAll href={`/dashboard/view-sales?view=${topGroups.view}&${query}`} />
                        </SectionCard>
                    </Grid>
                )}
            </Grid>

            <ReportStatistics summary={summary} showAreas={!scope} />
        </Container>
    );
}

Overview.layout = (page: ReactNode) => <DashboardLayout children={page} />;

export default Overview;
