import { ReactNode } from "react";
import { Box, Container, Grid, Typography, useMediaQuery, useTheme } from "@mui/material";
import { AccountCircleOutlined, ChevronRightRounded } from "@mui/icons-material";
import { Link } from "@inertiajs/react";
import AppLayout from "../../components/layouts/AppLayout";
import SectionTitle from "../../components/utils/SectionTitle";
import StatTile from "../../components/charts/StatTile";
import OnlineUsersPanel from "../../components/utils/user/OnlineUsersPanel";
import SalesLeaderboards from "../../components/utils/SalesLeaderboards";
import useAuthUser from "../../hooks/useAuthUser";
import usePortalRoutes from "../../hooks/usePortalRoutes";
import useOnlineUsers from "../../hooks/useOnlineUsers";
import { formatCount, formatPesoCompact } from "../../helpers/formatNumber";
import { StatsSummary } from "../../types/app-data-types";

interface DashboardProps {
    // Present only when the role has `view_reports`.
    kpis: StatsSummary["kpis"] | null;
}

function QuickLink({ name, path, icon: Icon }: { name: string; path: string; icon?: React.ElementType }) {
    return (
        <Link href={path} style={{ textDecoration: "none" }}>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    p: 2,
                    borderRadius: 3,
                    border: "1px solid var(--lr-border)",
                    backgroundColor: "var(--lr-surface)",
                    transition: "box-shadow 0.2s",
                    ":hover": { boxShadow: "0 1px 3px rgba(60,64,67,.15), 0 4px 8px rgba(60,64,67,.1)" },
                }}
            >
                <Box
                    sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--lr-primary)",
                        backgroundColor: "var(--lr-primary-soft)",
                    }}
                >
                    {Icon && <Icon fontSize="small" />}
                </Box>
                <Typography variant="body2" sx={{ flex: 1, fontWeight: 500, color: "var(--lr-text-primary)" }}>
                    {name}
                </Typography>
                <ChevronRightRounded sx={{ color: "var(--lr-text-secondary)" }} />
            </Box>
        </Link>
    );
}

// Home page of the admin and staff portals. What it offers follows the role's permissions.
function Dashboard({ kpis }: DashboardProps) {
    const user = useAuthUser();
    const theme = useTheme();
    const desktop = useMediaQuery(theme.breakpoints.up("lg"), { noSsr: true });
    const { users: onlineUsers, live } = useOnlineUsers(!!user);
    const links = usePortalRoutes().filter((r) => r.path !== user?.home);

    return (
        <Box>
            <Box sx={{ backgroundColor: "var(--lr-surface-dim)", borderBottom: "1px solid var(--lr-border)", px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 4 } }}>
                <Typography sx={{ fontSize: { xs: 22, sm: 28 }, color: "var(--lr-text-primary)" }}>
                    Welcome back{user?.first_name ? `, ${user.first_name}` : ""} 👋
                </Typography>
                <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", mt: 0.5 }}>
                    You're signed in to the {user?.role ?? ""} portal.
                </Typography>
            </Box>

            {!desktop && <OnlineUsersPanel users={onlineUsers} live={live} variant="strip" />}

            <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4 } }}>
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, lg: 8.5 }} sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {kpis && (
                            <Box>
                                <SectionTitle title="Last 12 months" subtitle="Project sales across the company." />
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <StatTile label="Sales recorded" value={formatCount(kpis.sales.value)} current={kpis.sales.value} previous={kpis.sales.previous} comparisonLabel="vs the 12 months before" />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <StatTile label="Total contract value" value={formatPesoCompact(kpis.contract_value.value)} current={kpis.contract_value.value} previous={kpis.contract_value.previous} comparisonLabel="vs the 12 months before" />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <StatTile label="Average deal size" value={formatPesoCompact(kpis.average_deal.value)} current={kpis.average_deal.value} previous={kpis.average_deal.previous} comparisonLabel="vs the 12 months before" />
                                    </Grid>
                                </Grid>
                            </Box>
                        )}

                        <Box>
                            <SectionTitle title="Go to" subtitle="Everything your role can open." />
                            <Grid container spacing={2}>
                                {links.map((r) => (
                                    <Grid key={r.path} size={{ xs: 12, sm: 6 }}>
                                        <QuickLink name={r.name} path={r.path} icon={r.icon} />
                                    </Grid>
                                ))}
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <QuickLink name="Edit profile" path="/profile" icon={AccountCircleOutlined} />
                                </Grid>
                            </Grid>
                        </Box>
                    </Grid>

                    {(desktop || user?.can.view_leaderboards) && (
                        <Grid size={{ xs: 12, lg: 3.5 }}>
                            <Box
                                sx={{
                                    border: "1px solid var(--lr-border)",
                                    borderRadius: 3,
                                    backgroundColor: "var(--lr-surface)",
                                    overflow: "hidden",
                                    position: { lg: "sticky" },
                                    top: { lg: 24 },
                                }}
                            >
                                {desktop && <OnlineUsersPanel users={onlineUsers} live={live} variant="list" />}
                                {user?.can.view_leaderboards && (
                                    <>
                                        {desktop && <Box sx={{ borderTop: "1px solid var(--lr-border)" }} />}
                                        <SalesLeaderboards />
                                    </>
                                )}
                            </Box>
                        </Grid>
                    )}
                </Grid>
            </Container>
        </Box>
    );
}

Dashboard.layout = (page: ReactNode) => <AppLayout children={page} />;

export default Dashboard;
