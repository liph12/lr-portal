import { ReactNode } from "react";
import { Box, Chip, Container, Grid, Typography } from "@mui/material";
import { ChevronRightRounded, PersonRounded } from "@mui/icons-material";
import { Link } from "@inertiajs/react";
import AppLayout from "../../../components/layouts/AppLayout";
import SectionTitle from "../../../components/utils/SectionTitle";
import NatconPeriod, { NatconBoardPeriod, NatconSettings, cutoffLabel, periodLabel } from "../../../components/natcon/NatconPeriod";
import { NATCON_BOARDS } from "../../../components/natcon/natconCatalog";
import { formatCount } from "../../../helpers/formatNumber";

export interface NatconBoard {
    slug: string;
    title: string;
    description: string;
    // What a row is.
    group: "agents" | "teams" | "sub_teams";
    category: string | null;
    period: NatconBoardPeriod;
}

// A leader's group: the boards only count it.
export interface NatconGroup {
    name: string;
    type: "team" | "sub_team";
}

interface NatconProps {
    settings: NatconSettings;
    // The main NATCON period (Top Rent Managers has its own, on its card).
    period: NatconBoardPeriod;
    boards: NatconBoard[];
    counts: Record<string, number>;
    group: NatconGroup | null;
    // The reader has an agent record: their own NATCON sales.
    hasMine: boolean;
}

const cardSx = {
    height: "100%",
    display: "flex",
    alignItems: "flex-start",
    gap: 2,
    p: 2.5,
    border: "1px solid var(--lr-border)",
    borderRadius: 3,
    backgroundColor: "var(--lr-surface)",
    transition: "box-shadow 0.2s ease",
    ":hover": { boxShadow: "0 1px 3px rgba(60,64,67,.15), 0 4px 8px rgba(60,64,67,.1)" },
};

const iconSx = {
    width: 44,
    height: 44,
    borderRadius: "50%",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--lr-primary)",
    backgroundColor: "var(--lr-primary-soft)",
};

// NATCON: one card per board, like Reports, each opening its own ranking for the convention period.
function Natcon({ settings, period, boards, counts, group, hasMine }: NatconProps) {
    return (
        <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4 } }}>
            <SectionTitle
                title="NATCON"
                subtitle={group ? `Who qualified on ${group.type === "team" ? "your team" : "your sub-team"}, ${group.name}.` : "National convention rankings. Pick a board."}
            />
            <NatconPeriod period={period} qualifier={settings.qualifier_amount} />
            <Grid container spacing={2}>
                {hasMine && (
                    <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
                        <Link href="/natcon/my-sales" style={{ textDecoration: "none", display: "block", height: "100%" }}>
                            <Box sx={cardSx}>
                                <Box sx={iconSx}>
                                    <PersonRounded />
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body1" sx={{ fontWeight: 500, color: "var(--lr-text-primary)" }}>
                                        My NATCON Sales
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", mt: 0.5 }}>
                                        Your own sales that count for NATCON, and how far you are from the qualifier.
                                    </Typography>
                                </Box>
                                <ChevronRightRounded sx={{ color: "var(--lr-text-secondary)", alignSelf: "center" }} />
                            </Box>
                        </Link>
                    </Grid>
                )}
                {boards.map(({ slug, title, description, group, period }) => {
                    const Icon = NATCON_BOARDS.find((b) => b.slug === slug)?.icon ?? NATCON_BOARDS[0].icon;
                    const count = counts[slug] ?? 0;

                    return (
                        <Grid key={slug} size={{ xs: 12, sm: 6, lg: 4 }}>
                            <Link href={`/natcon/${slug}`} style={{ textDecoration: "none", display: "block", height: "100%" }}>
                                <Box sx={cardSx}>
                                    <Box sx={iconSx}>
                                        <Icon />
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="body1" sx={{ fontWeight: 500, color: "var(--lr-text-primary)" }}>
                                            {title}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", mt: 0.5 }}>
                                            {description}
                                        </Typography>
                                        {/* Only a board on a period of its own says so (Top Rent Managers). */}
                                        {period.from !== boards[0].period.from || period.to !== boards[0].period.to || period.cutoff_at !== boards[0].period.cutoff_at ? (
                                            <Typography variant="caption" component="p" sx={{ color: "var(--lr-text-secondary)", mt: 0.75 }}>
                                                {periodLabel(period)} · encoded by {cutoffLabel(period)}
                                            </Typography>
                                        ) : null}
                                        <Chip
                                            size="small"
                                            label={`${formatCount(count)} ${group === "agents" ? (count === 1 ? "agent" : "agents") : group === "teams" ? (count === 1 ? "team" : "teams") : count === 1 ? "sub-team" : "sub-teams"}`}
                                            sx={{ mt: 1.25, height: 22, fontSize: 12, backgroundColor: "var(--lr-surface-container)", color: "var(--lr-text-secondary)" }}
                                        />
                                    </Box>
                                    <ChevronRightRounded sx={{ color: "var(--lr-text-secondary)", alignSelf: "center" }} />
                                </Box>
                            </Link>
                        </Grid>
                    );
                })}
            </Grid>
        </Container>
    );
}

Natcon.layout = (page: ReactNode) => <AppLayout children={page} />;

export default Natcon;
