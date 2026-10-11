import { ReactNode, useState } from "react";
import { Box, Container, Grid, LinearProgress, Typography } from "@mui/material";
import { Link, router } from "@inertiajs/react";
import AppLayout from "../../../components/layouts/AppLayout";
import SectionTitle from "../../../components/utils/SectionTitle";
import SectionCard from "../../../components/cards/SectionCard";
import StatTile from "../../../components/charts/StatTile";
import PagedBarList from "../../../components/charts/PagedBarList";
import MonthlyColumnChart from "../../../components/charts/MonthlyColumnChart";
import DateRangeField from "../../../components/utils/DateRangeField";
import FlagIcon from "../../../components/utils/FlagIcon";
import UserAvatar from "../../../components/utils/user/UserAvatar";
import GlobalPartnersNav from "../../../components/partners/GlobalPartnersNav";
import { reportPresets } from "../../../helpers/dateRanges";
import { formatCount, formatPeso, formatPesoCompact } from "../../../helpers/formatNumber";

interface PartnerStats {
    partners: { total: number; confirmed: number; pending: number; countries: number };
    by_country: { code: string | null; name: string; partners: number; confirmed: number }[];
    sales: { count: number; value: number; partners: number };
    client_countries: { name: string; code: string | null; sales: number; value: number }[];
    trend: { month: string; sales: number; value: number }[];
    top_partners: { id: number; name: string | null; avatar: string | null; country: string | null; country_code: string | null; sales: number; value: number }[];
    top_teams: { id: number; name: string; logo: string | null; partners: number; sales: number; value: number }[];
    // Empty for a sponsor-only reach (it would only list themselves).
    top_recruiters: { id: number; name: string; avatar: string | null; partners: number; sales: number; value: number }[];
    // What the page is narrowed to (a clicked team, recruiter or country).
    selection: { type: "team" | "recruiter" | "country"; name: string; code?: string | null } | null;
}

interface Props {
    stats: PartnerStats;
    filters: { from: string; to: string; team_id: number | null; sponsor_id: number | null; country: string | null };
    everyone: boolean;
}

// One gap everywhere between rows and cards.
const GAP = 3;

const plural = (n: number, one: string, many: string) => `${formatCount(n)} ${n === 1 ? one : many}`;

// Global partners' own statistics: where they are (flags) and their international sales — apart from the local reports.
function GlobalPartnerStatistics({ stats, filters, everyone }: Props) {
    const [loading, setLoading] = useState(false);
    const range = { from: filters.from, to: filters.to };
    const selected = { team_id: filters.team_id, sponsor_id: filters.sponsor_id, country: filters.country };
    const query = (q: Record<string, string | number | null | undefined>) =>
        new URLSearchParams(Object.entries(q).filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => [k, String(v)])).toString();
    // A row narrows the whole page to it (one at a time); the date range stays.
    const drill = (key: "team_id" | "sponsor_id" | "country", value: string | number) => `/global-partners/statistics?${query({ ...range, [key]: value })}`;
    const changeRange = (next: { from: string; to: string }) =>
        router.get("/global-partners/statistics", { ...selected, ...next }, { only: ["stats", "filters"], preserveState: true, preserveScroll: true, replace: true, onStart: () => setLoading(true), onFinish: () => setLoading(false) });

    const cards = [
        {
            key: "countries",
            node: (
                <SectionCard fill title="Global partners by country" subtitle="Where they're based — click one to see it">
                    <PagedBarList
                        items={stats.by_country.map((c) => ({ name: c.name, value: c.partners, detail: `${formatCount(c.confirmed)} confirmed`, leading: <FlagIcon code={c.code} title={c.name} />, href: c.code && !filters.country ? drill("country", c.code) : undefined }))}
                        caption="Global partners by the country they're based in"
                        searchLabel="Search countries"
                        formatValue={formatCount}
                        emptyText="No global partners yet."
                    />
                </SectionCard>
            ),
        },
        {
            key: "client-countries",
            node: (
                <SectionCard fill title="Sales by client country" subtitle="By contract value">
                    <PagedBarList
                        items={stats.client_countries.map((c) => ({ name: c.name, value: c.value, detail: plural(c.sales, "sale", "sales"), leading: <FlagIcon code={c.code} title={c.name} /> }))}
                        caption="International sales by the client's country"
                        searchLabel="Search countries"
                        formatValue={formatPesoCompact}
                        emptyText="No international sales in this range."
                    />
                </SectionCard>
            ),
        },
        {
            key: "teams",
            node: (
                <SectionCard fill title="Top teams" subtitle="By their global partners' international sales — click one to see it">
                    <PagedBarList
                        items={stats.top_teams.map((t) => ({
                            name: t.name,
                            value: t.value,
                            detail: `${plural(t.partners, "partner", "partners")} · ${plural(t.sales, "sale", "sales")}`,
                            leading: <UserAvatar name={t.name} src={t.logo} size={24} />,
                            href: filters.team_id ? undefined : drill("team_id", t.id),
                        }))}
                        caption="Teams by their global partners' international sales"
                        searchLabel="Search teams"
                        formatValue={formatPesoCompact}
                        emptyText="No global partners on a team."
                    />
                </SectionCard>
            ),
        },
        ...(stats.top_recruiters.length
            ? [
                  {
                      key: "recruiters",
                      node: (
                          <SectionCard fill title="Top recruiters" subtitle="By global partners recruited — click one to see them">
                              <PagedBarList
                                  items={stats.top_recruiters.map((r) => ({
                                      name: r.name,
                                      value: r.partners,
                                      detail: `${formatPesoCompact(r.value)} · ${plural(r.sales, "sale", "sales")}`,
                                      leading: <UserAvatar name={r.name} src={r.avatar} size={24} />,
                                      href: filters.sponsor_id ? undefined : drill("sponsor_id", r.id),
                                  }))}
                                  caption="Sponsors by the number of global partners they recruited"
                        searchLabel="Search recruiters"
                                  formatValue={formatCount}
                                  emptyText="No recruiters."
                              />
                          </SectionCard>
                      ),
                  },
              ]
            : []),
        {
            key: "partners",
            node: (
                <SectionCard fill title="Top global partners" subtitle="Partners who sold in this range, by contract value">
                    <PagedBarList
                        items={stats.top_partners.map((p) => ({
                            name: p.name ?? `Agent #${p.id}`,
                            value: p.value,
                            detail: plural(p.sales, "sale", "sales"),
                            leading: (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                                    <Link href={`/agents/${p.id}`} aria-label={`Profile of ${p.name}`}>
                                        <UserAvatar name={p.name ?? "?"} src={p.avatar} size={24} />
                                    </Link>
                                    <FlagIcon code={p.country_code} title={p.country ?? undefined} />
                                </Box>
                            ),
                        }))}
                        caption="Top global partners by international sales"
                        searchLabel="Search global partners"
                        formatValue={formatPesoCompact}
                        emptyText="No international sales in this range."
                    />
                </SectionCard>
            ),
        },
    ];

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>
            <SectionTitle
                title="Global Partners"
                subtitle={everyone ? "All global partners and their international sales." : "Your team's global partners and your recruits, and their international sales."}
                action={<DateRangeField value={filters} presets={reportPresets()} onChange={changeRange} />}
            />
            <GlobalPartnersNav />
            {loading && <LinearProgress sx={{ height: 2, mb: GAP }} />}

            {stats.selection && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mb: GAP, p: 2, borderRadius: 3, border: "1px solid var(--lr-border)", backgroundColor: "var(--lr-surface)" }}>
                    {stats.selection.type === "country" && <FlagIcon code={stats.selection.code ?? null} />}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                            {{ team: "Team", recruiter: "Recruiter", country: "Partners based in" }[stats.selection.type]}
                        </Typography>
                        <Typography sx={{ fontSize: 20, color: "var(--lr-text-primary)" }}>{stats.selection.name}</Typography>
                    </Box>
                    <Link href={`/global-partners/statistics?${query(range)}`} preserveScroll style={{ color: "var(--lr-primary)", fontSize: 14, fontWeight: 500 }}>
                        Show everyone
                    </Link>
                </Box>
            )}

            <Grid container spacing={GAP} sx={{ mb: GAP }}>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <StatTile label="Global partners" value={formatCount(stats.partners.total)} caption={`${formatCount(stats.partners.confirmed)} confirmed · ${formatCount(stats.partners.pending)} waiting`} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <StatTile label="Countries" value={formatCount(stats.partners.countries)} caption="where global partners are based" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <StatTile label="International sales" value={formatCount(stats.sales.count)} caption={`by ${plural(stats.sales.partners, "partner", "partners")} in this range`} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <StatTile label="Total contract value" value={formatPesoCompact(stats.sales.value)} caption={formatPeso(stats.sales.value)} />
                </Grid>
            </Grid>

            <Box sx={{ mb: GAP }}>
                <SectionCard title="International sales over time" subtitle="By reservation date">
                    <MonthlyColumnChart data={stats.trend} />
                </SectionCard>
            </Box>

            {/* Even pairs of equal-height cards; an odd last card takes the whole row. */}
            <Grid container spacing={GAP}>
                {cards.map((card, i) => (
                    <Grid key={card.key} size={{ xs: 12, lg: i === cards.length - 1 && cards.length % 2 === 1 ? 12 : 6 }}>
                        {card.node}
                    </Grid>
                ))}
            </Grid>
            <Typography variant="caption" component="p" sx={{ color: "var(--lr-text-secondary)", mt: GAP }}>
                International sales only (valid and pending); local project, rental and brokerage sales are in Reports.
            </Typography>
        </Container>
    );
}

GlobalPartnerStatistics.layout = (page: ReactNode) => <AppLayout children={page} />;

export default GlobalPartnerStatistics;
