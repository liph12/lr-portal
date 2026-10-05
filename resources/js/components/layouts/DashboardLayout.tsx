import { ReactNode } from "react";
import { Box, Grid } from "@mui/material";
import { useAppRoutes } from "../../app-data";
import { isRouteActive } from "../../helpers/routeMatch";
import { usePage, Link } from "@inertiajs/react";
import StyledButton from "../utils/StyledButton";
import AppLayout from "./AppLayout";
import DashboardFilters from "../utils/DashboardFilters";
import DashboardLeaderboards from "../utils/DashboardLeaderboards";

const DASHBOARD_ROUTES = useAppRoutes[0];

function DashboardLayout({ children }: { children: ReactNode }) {
    const { url } = usePage();
    const routeNodes = DASHBOARD_ROUTES.children;
    const nodePath = routeNodes.find((r) => url.includes(r.path))?.path;
    const showFilters = nodePath === "/superadmin/dashboard/overview";
    const showLeaderboards =
        nodePath === "/superadmin/dashboard/main" ||
        nodePath === "/superadmin/dashboard/record-sale";

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
                        overflowY: { lg: "auto" },
                        overflowX: "hidden",
                        scrollBehavior: "smooth",
                        borderLeft: { lg: "1px solid var(--lr-border)" },
                        borderTop: { xs: "1px solid var(--lr-border)", lg: "none" },
                        backgroundColor: "var(--lr-surface)",
                    }}
                >
                    {showFilters && <DashboardFilters />}
                    {showLeaderboards && <DashboardLeaderboards />}
                </Grid>
            </Grid>
        </AppLayout>
    );
}

export default DashboardLayout;
