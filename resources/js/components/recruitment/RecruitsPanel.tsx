import { Box, Grid, Typography } from "@mui/material";
import { ArrowForwardRounded } from "@mui/icons-material";
import { Link } from "@inertiajs/react";
import SectionCard from "../cards/SectionCard";
import StatTile from "../charts/StatTile";
import StyledButton from "../utils/StyledButton";
import { formatCount, formatPesoCompact } from "../../helpers/formatNumber";
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
    value: number;
    from: string;
    to: string;
    fire: StatusBuckets;
    nao: StatusBuckets;
    overall: StatusBuckets;
    // Opens the list of these recruits.
    viewHref: string;
}

function Breakdown({ title, labels, buckets }: { title: string; labels: [string, string, string]; buckets: StatusBuckets }) {
    const values = [buckets.not_started, buckets.in_progress, buckets.finished];

    return (
        <SectionCard title={title}>
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
    );
}

// Recruits Progress KPIs: totals for the sign-up range, then how the recruits still in training (no sale yet) are
// doing — NAO 0 / 1–99 / 100%, then FIRE 0 / 1–2 / 3+, and both together.
export default function RecruitsPanel({ recruits, trainees, sold, conversion, value, from, to, fire, nao, overall, viewHref }: RecruitsPanelProps) {
    return (
        <Box component="section" aria-label="Recruits progress" sx={{ mb: 4 }}>
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <StatTile label="Total recruits" value={formatCount(recruits)} caption={`Recruits as of ${formatDate(from)} – ${formatDate(to)}`} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <StatTile label="Recruits who sold" value={formatCount(sold)} caption={`${conversion}% of recruits`} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <StatTile label="Recruits' total sales" value={formatPesoCompact(value)} caption="Valid sales, any date" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <StatTile label="Still in training" value={formatCount(trainees)} caption="No sale yet — counted below" />
                </Grid>
            </Grid>
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Breakdown title="NAO" labels={["Not yet started", "On progress", "Finished"]} buckets={nao} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Breakdown title="FIRE" labels={["Not yet started", "On progress", "Finished"]} buckets={fire} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Breakdown title="Overall" labels={["No activity", "On progress", "Completed"]} buckets={overall} />
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
