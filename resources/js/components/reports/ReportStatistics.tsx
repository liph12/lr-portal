import { Box, Grid } from "@mui/material";
import SectionCard from "../cards/SectionCard";
import SectionTitle from "../utils/SectionTitle";
import StatTile from "../charts/StatTile";
import MonthlyColumnChart from "../charts/MonthlyColumnChart";
import BarList from "../charts/BarList";
import ShareBar from "../charts/ShareBar";
import { formatCount, formatPesoCompact } from "../../helpers/formatNumber";
import { formatDate } from "../../helpers/formatDate";
import ClientAgeChart from "./ClientAgeChart";
import { ClientAges } from "../../types/app-data-types";

export interface Kpi {
    value: number;
    previous: number | null;
}

export interface ReportSummary {
    kpis: { sales: Kpi; value: Kpi; average: Kpi; agents: Kpi };
    bucket: "month" | "year";
    trend: { month: string; sales: number; value: number }[];
    categories: { category: string; sales: number; value: number }[];
    areas: { area: string; name: string; sales: number; value: number }[];
    client_countries: { name: string; code: string | null; sales: number; value: number }[];
    // Always Male, Female, Not specified (in that order, so each keeps its colour).
    client_genders: { name: string; sales: number; value: number }[];
    client_ages: ClientAges;
    property_types: { name: string; sales: number; value: number }[];
    // Project sales only (empty when the report excludes project sales); share is of `total`.
    developers: { total: number; rows: { id: number; name: string; sales: number; value: number; share: number }[] };
    comparison: { from: string; to: string };
}

interface ReportStatisticsProps {
    summary: ReportSummary;
    // Hidden when the report is about one category / already split by area / one agent.
    showCategories?: boolean;
    showAreas?: boolean;
    showAgentsTile?: boolean;
}

export const CATEGORY_LABELS: Record<string, string> = {
    project: "Project",
    rental: "Rental",
    brokerage: "Brokerage",
};

const salesWord = (n: number) => `${formatCount(n)} ${n === 1 ? "sale" : "sales"}`;

// Totals vs the previous period, the trend, and the splits by category, area, client country / gender and property type.
export default function ReportStatistics({ summary, showCategories = true, showAreas = true, showAgentsTile = true }: ReportStatisticsProps) {
    const { kpis } = summary;
    const comparison = `vs ${formatDate(summary.comparison.from)} – ${formatDate(summary.comparison.to)}`;
    const tile = { xs: 12, sm: 6, lg: showAgentsTile ? 3 : 4 };

    return (
        <Box component="section" aria-label="Statistics">
            <SectionTitle title="Statistics" subtitle="For the same filters, compared with the period just before." />
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={tile}>
                    <StatTile label="Total sales" value={formatPesoCompact(kpis.value.value)} current={kpis.value.value} previous={kpis.value.previous} comparisonLabel={comparison} />
                </Grid>
                <Grid size={tile}>
                    <StatTile label="Sales recorded" value={formatCount(kpis.sales.value)} current={kpis.sales.value} previous={kpis.sales.previous} comparisonLabel={comparison} />
                </Grid>
                <Grid size={tile}>
                    <StatTile label="Average deal" value={formatPesoCompact(kpis.average.value)} current={kpis.average.value} previous={kpis.average.previous} comparisonLabel={comparison} />
                </Grid>
                {showAgentsTile && (
                    <Grid size={tile}>
                        <StatTile label="Agents with sales" value={formatCount(kpis.agents.value)} current={kpis.agents.value} previous={kpis.agents.previous} comparisonLabel={comparison} />
                    </Grid>
                )}
            </Grid>

            <Grid container spacing={2}>
                {summary.developers.rows.length > 0 && (
                    <Grid size={12}>
                        <SectionCard title="Top developers" subtitle={`Share of ${formatPesoCompact(summary.developers.total)} in project sales`}>
                            <BarList
                                items={summary.developers.rows.map((d) => ({
                                    name: d.name,
                                    value: d.value,
                                    detail: `${d.share}% share · ${salesWord(d.sales)}`,
                                    tooltip: `${d.name}: ${formatPesoCompact(d.value)}, ${d.share}% of project sales`,
                                }))}
                                caption="Total project sales by developer, with each one's share of all project sales"
                                formatValue={formatPesoCompact}
                                emptyText="No project sales match these filters."
                            />
                        </SectionCard>
                    </Grid>
                )}
                <Grid size={{ xs: 12, lg: showCategories ? 8 : 12 }}>
                    <SectionCard title="Over time">
                        <MonthlyColumnChart data={summary.trend} bucket={summary.bucket} />
                    </SectionCard>
                </Grid>
                {showCategories && (
                    <Grid size={{ xs: 12, lg: 4 }}>
                        <SectionCard title="By category">
                            <BarList
                                items={summary.categories.map((c) => ({ name: CATEGORY_LABELS[c.category] ?? c.category, value: c.value, detail: salesWord(c.sales) }))}
                                caption="Total sales by sale category"
                                formatValue={formatPesoCompact}
                                emptyText="No sales match these filters."
                            />
                        </SectionCard>
                    </Grid>
                )}
                <Grid size={{ xs: 12, lg: 4 }}>
                    <SectionCard title="By client country">
                        <BarList
                            items={summary.client_countries.map((c) => ({ name: c.name, value: c.value, detail: salesWord(c.sales) }))}
                            caption="Total sales by the client's country"
                            formatValue={formatPesoCompact}
                            emptyText="No sales match these filters."
                        />
                    </SectionCard>
                </Grid>
                <Grid size={{ xs: 12, lg: 4 }}>
                    <SectionCard title="By client gender">
                        <ShareBar
                            segments={summary.client_genders.map((g) => ({ label: g.name, value: g.sales }))}
                            caption="Sales by the client's gender"
                            unit={["sale", "sales"]}
                            emptyText="No sales match these filters."
                        />
                    </SectionCard>
                </Grid>
                <Grid size={{ xs: 12, lg: 4 }}>
                    <SectionCard title="By client age">
                        <ClientAgeChart ages={summary.client_ages} />
                    </SectionCard>
                </Grid>
                <Grid size={{ xs: 12, lg: 4 }}>
                    <SectionCard title="By property type">
                        <BarList
                            items={summary.property_types.map((p) => ({ name: p.name, value: p.value, detail: salesWord(p.sales) }))}
                            caption="Total sales by property type"
                            formatValue={formatPesoCompact}
                            emptyText="No sales match these filters."
                        />
                    </SectionCard>
                </Grid>
                {showAreas && (
                    <Grid size={12}>
                        <SectionCard title="By area">
                            <BarList
                                items={summary.areas.map((a) => ({ name: a.name, value: a.value, detail: salesWord(a.sales) }))}
                                caption="Total sales by the area the agent belongs to"
                                formatValue={formatPesoCompact}
                                emptyText="No sales match these filters."
                            />
                        </SectionCard>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
}
