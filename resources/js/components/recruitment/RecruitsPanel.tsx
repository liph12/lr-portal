import { ElementType } from "react";
import { Box, Grid, Typography } from "@mui/material";
import { AccountBalanceWalletRounded, ArrowForwardRounded, FactCheckRounded, GroupAddRounded, LocalFireDepartmentRounded, OndemandVideoRounded, PaymentsRounded, SchoolRounded, TrendingUpRounded } from "@mui/icons-material";
import { Link } from "@inertiajs/react";
import SectionCard from "../cards/SectionCard";
import AreaOnlyNote from "./AreaOnlyNote";
import StatTile from "../charts/StatTile";
import StyledButton from "../utils/StyledButton";
import { formatCount, formatPesoExact } from "../../helpers/formatNumber";
import { formatDate } from "../../helpers/formatDate";

export interface StatusBuckets {
    not_started: number;
    in_progress: number;
    finished: number;
}

interface RecruitsPanelProps {
    recruits: number;
    // Recruits without a sale yet: the ones the NAO / FIRE numbers describe.
    trainees: number;
    sold: number;
    conversion: number;
    // What the new recruits sold (any date), and — for a team, sub-team, branch or everyone — all its members' valid sales in
    // the range, old members' too (Top Teams' figure), to compare against; null for one sponsor's recruits.
    value: number;
    totalSales?: number | null;
    from: string;
    to: string;
    fire: StatusBuckets;
    nao: StatusBuckets;
    overall: StatusBuckets;
    // Opens the list of these recruits.
    viewHref: string;
    // The area every count is limited to, named on the cards.
    area?: string | null;
}

function Breakdown({ title, labels, buckets, icon: Icon }: { title: string; labels: [string, string, string]; buckets: StatusBuckets; icon: ElementType }) {
    const values = [buckets.not_started, buckets.in_progress, buckets.finished];

    return (
        // A large, faint icon behind the figures, like the stat tiles.
        <Box sx={{ position: "relative", height: "100%", borderRadius: 3, overflow: "hidden" }}>
            <SectionCard title={title} fill>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
                    {labels.map((label, i) => (
                        <Box key={label}>
                            <Typography sx={{ fontSize: 24, fontWeight: 500, color: "var(--lr-text-primary)", lineHeight: 1.2 }}>{formatCount(values[i])}</Typography>
                            <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                                {label}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            </SectionCard>
            <Icon aria-hidden sx={{ position: "absolute", right: -14, bottom: -18, fontSize: 112, color: "var(--lr-primary)", opacity: 0.07, pointerEvents: "none" }} />
        </Box>
    );
}

// Recruits Progress KPIs: totals for the sign-up range, then how the recruits still in training (no sale yet) are
// doing — NAO 0 / 1–99 / 100%, then FIRE 0 / 1–2 / 3+, and both together.
export default function RecruitsPanel({ recruits, trainees, sold, conversion, value, totalSales = null, from, to, fire, nao, overall, viewHref, area = null }: RecruitsPanelProps) {
    const inArea = (title: string) => (area ? `${title} · ${area}` : title);
    const compare = totalSales !== null;

    return (
        <Box component="section" aria-label="Recruits progress" sx={{ mb: 4 }}>
            {area && <AreaOnlyNote area={area} />}
            {/* Who joined first; then, for a group, its whole total beside what the new recruits sold (the KPI). */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 12, sm: 6, lg: compare ? 4 : 3 }}>
                    <StatTile icon={GroupAddRounded} label={inArea("New recruits")} value={formatCount(recruits)} caption={`Signed up ${formatDate(from)} – ${formatDate(to)}`} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: compare ? 4 : 3 }}>
                    <StatTile icon={TrendingUpRounded} label="New recruits who sold" value={formatCount(sold)} caption={`${conversion}% of new recruits`} />
                </Grid>
                {!compare && (
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                        <StatTile icon={PaymentsRounded} label="New recruits' total sales" value={formatPesoExact(value)} caption="Their valid sales, any date" />
                    </Grid>
                )}
                <Grid size={{ xs: 12, sm: 6, lg: compare ? 4 : 3 }}>
                    <StatTile icon={SchoolRounded} label="Still in training" value={formatCount(trainees)} caption="New recruits with no sale yet" />
                </Grid>
            </Grid>
            {compare && (
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <StatTile icon={AccountBalanceWalletRounded} label={inArea("Total sales — all members")} value={formatPesoExact(totalSales)} caption={`Valid sales reserved ${formatDate(from)} – ${formatDate(to)}, old members included`} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <StatTile icon={PaymentsRounded}
                            label="New recruits' total sales"
                            value={formatPesoExact(value)}
                            caption={totalSales > 0 ? `${((value / totalSales) * 100).toFixed(1)}% of the total · their valid sales, any date` : "Their valid sales, any date"}
                        />
                    </Grid>
                </Grid>
            )}
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Breakdown icon={OndemandVideoRounded} title={inArea("NAO")} labels={["Not yet started", "On progress", "Finished"]} buckets={nao} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Breakdown icon={LocalFireDepartmentRounded} title={inArea("FIRE")} labels={["Not yet started", "On progress", "Finished"]} buckets={fire} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Breakdown icon={FactCheckRounded} title={inArea("Overall")} labels={["No activity", "On progress", "Completed"]} buckets={overall} />
                </Grid>
            </Grid>
            <Link href={viewHref} style={{ textDecoration: "none" }}>
                <StyledButton size="small" variant="text" endIcon={<ArrowForwardRounded />} sx={{ mt: 1, px: 1, color: "var(--lr-primary)" }}>
                    View these recruits
                </StyledButton>
            </Link>
        </Box>
    );
}
