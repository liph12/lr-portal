import { ReactNode } from "react";
import { Box, Divider, Grid, useMediaQuery, useTheme } from "@mui/material";
import OnlineUsersPanel from "../utils/user/OnlineUsersPanel";
import useAuthUser from "../../hooks/useAuthUser";
import useOnlineUsers from "../../hooks/useOnlineUsers";
import { useAppRoutes } from "../../app-data";
import { isRouteActive } from "../../helpers/routeMatch";
import { usePage, Link } from "@inertiajs/react";
import StyledButton from "../utils/StyledButton";
import AppLayout from "./AppLayout";
import DashboardFilters from "../utils/DashboardFilters";
import SalesLeaderboards from "../utils/SalesLeaderboards";

const DASHBOARD_ROUTES = useAppRoutes[0];

function DashboardLayout({ children }: { children: ReactNode }) {
    const theme = useTheme();
    const desktop = useMediaQuery(theme.breakpoints.up("lg"), { noSsr: true });
    const authUser = useAuthUser();
    const showOnline = !!authUser;
    const showLeaderboards = !!authUser?.can.view_leaderboards;
    const { users: onlineUsers, live } = useOnlineUsers(showOnline);
    const { url } = usePage();
    const routeNodes = DASHBOARD_ROUTES.children;
    const nodePath = routeNodes.find((r) => url.includes(r.path))?.path;
    const showFilters = nodePath === "/superadmin/dashboard/overview";

    return (
        <AppLayout>
            {/* lg+: two fixed-height columns that scroll on their own; below: one column scrolled by AppLayout's main */}
            <Grid
                container
                sx={{ height: { lg: "100%" }, overflow: { lg: "hidden" } }}
            >
                <Grid
                    size={{ xs: 12, lg: 9.5 }}
                    sx={{
                        height: { lg: "100%" },
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    {/* Tab bar — sticky on mobile so section switching stays in reach */}
                    <Box
                        sx={{
                            pt: 1.5,
                            pb: 1,
                            px: { xs: 2, sm: 3 },
                            display: "flex",
                            gap: 1,
                            flexShrink: 0,
                            backgroundColor: "var(--lr-surface)",
                            borderBottom: "1px solid var(--lr-border)",
                            overflowX: "auto",
                            scrollbarWidth: "none",
                            "&::-webkit-scrollbar": { display: "none" },
                            position: { xs: "sticky", lg: "static" },
                            top: 0,
                            zIndex: 2,
                        }}
                    >
                        {routeNodes.map((r) => {
                            const active = isRouteActive(url, r.path);
                            return (
                                <Link
                                    key={r.path}
                                    href={r.path}
                                    style={{ textDecoration: "none" }}
                                >
                                    <StyledButton
                                        startIcon={<r.icon />}
                                        size="small"
                                        variant="text"
                                        sx={{
                                            borderRadius: 99,
                                            textTransform: "none",
                                            whiteSpace: "nowrap",
                                            flexShrink: 0,
                                            px: 2,
                                            fontWeight: 500,
                                            color: active
                                                ? "var(--lr-primary)"
                                                : "var(--lr-text-secondary)",
                                            backgroundColor: active
                                                ? "var(--lr-primary-soft)"
                                                : "transparent",
                                            ":hover": {
                                                backgroundColor: active
                                                    ? "var(--lr-primary-soft)"
                                                    : "var(--lr-surface-container)",
                                            },
                                        }}
                                    >
                                        {r.name}
                                    </StyledButton>
                                </Link>
                            );
                        })}
                    </Box>

                    {showOnline && !desktop && <OnlineUsersPanel users={onlineUsers} live={live} variant="strip" />}

                    {/* Scrollable content area */}
                    <Box
                        sx={{
                            flex: 1,
                            overflowY: { lg: "auto" },
                            overflowX: "hidden",
                            scrollBehavior: "smooth",
                            minHeight: 0,
                            pb: { xs: 4, lg: 20 },
                            backgroundColor: "var(--lr-surface)",
                        }}
                    >
                        {children}
                    </Box>
                </Grid>
                <Grid
                    size={{ xs: 12, lg: 2.5 }}
                    sx={{
                        height: { lg: "100%" },
                        display: "flex",
                        flexDirection: "column",
                        borderLeft: { lg: "1px solid var(--lr-border)" },
                        borderTop: { xs: "1px solid var(--lr-border)", lg: "none" },
                        backgroundColor: "var(--lr-surface)",
                    }}
                >
                    {/* Pinned above the panel's own scroll so who's online is always in view, like a chat sidebar. */}
                    {showOnline && desktop && (
                        <Box sx={{ flexShrink: 0 }}>
                            <OnlineUsersPanel users={onlineUsers} live={live} variant="list" />
                            <Divider sx={{ borderColor: "var(--lr-border)" }} />
                        </Box>
                    )}
                    <Box
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            overflowY: { lg: "auto" },
                            overflowX: "hidden",
                            scrollBehavior: "smooth",
                        }}
                    >
                        {showLeaderboards && <SalesLeaderboards />}
                        {showFilters && <DashboardFilters />}
                    </Box>
                </Grid>
            </Grid>
        </AppLayout>
    );
}

export default DashboardLayout;
