import { ReactNode, useState } from "react";
import { Box, Container, Grid, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { router, usePage } from "@inertiajs/react";
import AppLayout from "../../components/layouts/AppLayout";
import SectionTitle from "../../components/utils/SectionTitle";
import SectionCard from "../../components/cards/SectionCard";
import StatTile from "../../components/charts/StatTile";
import MonthlyColumnChart from "../../components/charts/MonthlyColumnChart";
import BarList from "../../components/charts/BarList";
import ShareBar from "../../components/charts/ShareBar";
import UserStatusChip from "../../components/utils/user/UserStatusChip";
import ClientAgeChart from "../../components/reports/ClientAgeChart";
import { formatCount, formatPeso, formatPesoCompact } from "../../helpers/formatNumber";
import { StatsPeriod, StatsSummary } from "../../types/app-data-types";

const PERIODS: { value: StatsPeriod; label: string; comparison: string }[] = [
    { value: "12m", label: "Last 12 months", comparison: "vs the 12 months before" },
    { value: "year", label: "This year", comparison: "vs the same number of days before" },
    { value: "all", label: "All time", comparison: "" },
];

const salesWord = (n: number) => `${n} ${n === 1 ? "sale" : "sales"}`;

function Statistics({ stats }: { stats: StatsSummary }) {
    const [loading, setLoading] = useState(false);
    // Shared by /superadmin, /admin and /staff; reload whichever one we're on.
    const path = usePage().url.split("?")[0];
    const period = PERIODS.find((p) => p.value === stats.period) ?? PERIODS[0];
    const { kpis } = stats;

    const changePeriod = (value: StatsPeriod | null) => {
        if (!value || value === stats.period) return;
        router.get(
            path,
            value === "12m" ? {} : { period: value },
            {
                only: ["stats"],
                preserveScroll: true,
                preserveState: true,
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            },
        );
    };

    return (
        <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4 } }}>
            <SectionTitle
                title="Statistics"
                subtitle="Project sales and team at a glance."
                action={
                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={stats.period}
                        onChange={(_, v: StatsPeriod | null) => changePeriod(v)}
                        aria-label="Time period"
                        disabled={loading}
                        sx={{
                            flexShrink: 0,
                            "& .MuiToggleButton-root": { textTransform: "none", px: 1.5, py: 0.5, fontSize: 13, borderColor: "var(--lr-border)" },
                            "& .Mui-selected": { color: "var(--lr-primary) !important", backgroundColor: "var(--lr-primary-soft) !important" },
                        }}
                    >
                        {PERIODS.map((p) => (
                            <ToggleButton key={p.value} value={p.value}>
                                {p.label}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                }
            />

            <Box sx={{ opacity: loading ? 0.55 : 1, transition: "opacity 0.15s", display: "flex", flexDirection: "column", gap: 3 }}>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                        <StatTile
                            label="Sales recorded"
                            value={formatCount(kpis.sales.value)}
                            current={kpis.sales.value}
                            previous={kpis.sales.previous}
                            comparisonLabel={period.comparison}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                        <StatTile
                            label="Total contract value"
                            value={formatPesoCompact(kpis.contract_value.value)}
                            current={kpis.contract_value.value}
                            previous={kpis.contract_value.previous}
                            comparisonLabel={period.comparison}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                        <StatTile
                            label="Average deal size"
                            value={formatPesoCompact(kpis.average_deal.value)}
                            current={kpis.average_deal.value}
                            previous={kpis.average_deal.previous}
                            comparisonLabel={period.comparison}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                        <StatTile
                            label="Active users"
                            value={formatCount(kpis.active_users.value)}
                            caption={`of ${kpis.active_users.total} accounts`}
                        />
                    </Grid>
                </Grid>

                <SectionCard title="Sales over time" subtitle={period.label}>
                    <MonthlyColumnChart data={stats.monthly} />
                </SectionCard>

                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <SectionCard title="Top developers" subtitle="By total contract value">
                            <BarList
                                caption="Top developers by contract value"
                                items={stats.developers.map((d) => ({
                                    name: d.name,
                                    value: d.value,
                                    detail: salesWord(d.sales),
                                    tooltip: `${d.name}: ${formatPeso(d.value)} from ${salesWord(d.sales)}`,
                                }))}
                                formatValue={formatPesoCompact}
                                emptyText="No developer sales in this period yet."
                            />
                        </SectionCard>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <SectionCard title="Sales by property type" subtitle="Number of sales">
                            <BarList
                                caption="Sales by property type"
                                items={stats.propertyTypes.map((t) => ({
                                    name: t.name,
                                    value: t.sales,
                                    detail: formatPesoCompact(t.value),
                                    tooltip: `${t.name}: ${salesWord(t.sales)}, ${formatPeso(t.value)}`,
                                }))}
                                formatValue={formatCount}
                                emptyText="No sales in this period yet."
                            />
                        </SectionCard>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <SectionCard title="Clients by country" subtitle="Total contract value">
                            <BarList
                                caption="Total project sales by the client's country"
                                items={stats.clients.countries.map((c) => ({ name: c.name, value: c.value, detail: salesWord(c.sales) }))}
                                formatValue={formatPesoCompact}
                                emptyText="No sales in this period yet."
                            />
                        </SectionCard>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <SectionCard title="Clients by gender" subtitle="Share of sales in this period">
                            <ShareBar
                                caption="Project sales by the client's gender"
                                segments={stats.clients.genders.map((g) => ({ label: g.name, value: g.sales }))}
                                unit={["sale", "sales"]}
                                emptyText="No sales in this period yet."
                            />
                        </SectionCard>
                        <Box sx={{ mt: 2 }}>
                            <SectionCard title="Clients by age" subtitle="Ages 18–99 only">
                                <ClientAgeChart ages={stats.clients.ages} />
                            </SectionCard>
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <SectionCard title="Team" subtitle="All accounts, any period">
                            <BarList
                                caption="Users by role"
                                items={stats.team.byRole.map((r) => ({ name: r.name, value: r.users }))}
                                formatValue={formatCount}
                                emptyText="No users have a role yet."
                            />
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 2.5, pt: 2, borderTop: "1px solid var(--lr-border)" }}>
                                {stats.team.byStatus.map((s) => (
                                    <Box key={s.status} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                                        <UserStatusChip status={s.status} />
                                        <Typography variant="body2" fontFamily="Google Sans Code" sx={{ color: "var(--lr-text-primary)" }}>
                                            {s.users}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        </SectionCard>
                    </Grid>
                </Grid>
            </Box>
        </Container>
    );
}

Statistics.layout = (page: ReactNode) => <AppLayout children={page} />;

export default Statistics;
