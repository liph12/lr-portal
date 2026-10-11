import { ReactNode } from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { usePage, Link } from "@inertiajs/react";
import OnlineUsersPanel from "../utils/user/OnlineUsersPanel";
import useAuthUser from "../../hooks/useAuthUser";
import useOnlineUsers from "../../hooks/useOnlineUsers";
import { dashboardRoute } from "../../app-data";
import { grantedWithLeadership, hasAnyPermission } from "../../helpers/permissions";
import { isRouteActive } from "../../helpers/routeMatch";
import StyledButton from "../utils/StyledButton";
import AppLayout from "./AppLayout";

// Dashboard tab bar over the page; the right rail (online users, leaderboards) comes from AppLayout.
function DashboardLayout({ children }: { children: ReactNode }) {
    const theme = useTheme();
    const desktop = useMediaQuery(theme.breakpoints.up("lg"), { noSsr: true });
    const authUser = useAuthUser();
    const showOnlineStrip = !!authUser?.portal && !desktop;
    const { users: onlineUsers, live } = useOnlineUsers(showOnlineStrip);
    const { url } = usePage();
    // Tabs the role may open (Record Your Sale needs a recording permission).
    const tabs = dashboardRoute.children.filter((r: { permission?: string | string[] }) => hasAnyPermission(grantedWithLeadership(authUser?.permissions, authUser?.leads, authUser?.portal), r.permission));

    return (
        <AppLayout>
            {/* Sticky so section switching stays in reach while the page scrolls */}
            <Box
                sx={{
                    pt: 1.5,
                    pb: 1,
                    px: { xs: 2, sm: 3 },
                    display: "flex",
                    gap: 1,
                    backgroundColor: "var(--lr-surface)",
                    borderBottom: "1px solid var(--lr-border)",
                    overflowX: "auto",
                    scrollbarWidth: "none",
                    "&::-webkit-scrollbar": { display: "none" },
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                }}
            >
                {tabs.map((r) => {
                    const active = isRouteActive(url, r.path);
                    return (
                        <Link key={r.path} href={r.path} style={{ textDecoration: "none" }}>
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
                                    color: active ? "var(--lr-primary)" : "var(--lr-text-secondary)",
                                    backgroundColor: active ? "var(--lr-primary-soft)" : "transparent",
                                    ":hover": {
                                        backgroundColor: active ? "var(--lr-primary-soft)" : "var(--lr-surface-container)",
                                    },
                                }}
                            >
                                {r.name}
                            </StyledButton>
                        </Link>
                    );
                })}
            </Box>

            {showOnlineStrip && <OnlineUsersPanel users={onlineUsers} live={live} variant="strip" />}

            <Box sx={{ pb: { xs: 4, lg: 20 }, backgroundColor: "var(--lr-surface)" }}>{children}</Box>
        </AppLayout>
    );
}

export default DashboardLayout;
