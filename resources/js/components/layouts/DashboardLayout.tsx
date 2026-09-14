import { ReactNode } from "react";
import { Box, Divider, Grid } from "@mui/material";
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
    const nodeName = routeNodes.find((r) => url.includes(r.path))?.name;

    return (
        <AppLayout>
            <Grid container sx={{ height: "100vh" }}>
                <Grid
                    size={{ lg: 9.5 }}
                    sx={{
                        height: "100vh",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    {/* Fixed tab bar */}
                    <Box
                        sx={{
                            pt: 1.5,
                            pb: 1,
                            px: 3,
                            display: "flex",
                            gap: 1,
                            flexShrink: 0,
                            backgroundColor: "#fff",
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
                                            px: 2,
                                            fontWeight: 500,
                                            color: active
                                                ? "#1a73e8"
                                                : "#5f6368",
                                            backgroundColor: active
                                                ? "#e8f0fe"
                                                : "transparent",
                                            ":hover": {
                                                backgroundColor: active
                                                    ? "#e8f0fe"
                                                    : "#f1f3f4",
                                            },
                                        }}
                                    >
                                        {r.name}
                                    </StyledButton>
                                </Link>
                            );
                        })}
                    </Box>
                    <Divider sx={{ flexShrink: 0, borderColor: "#e8eaed" }} />

                    {/* Scrollable content area */}
                    <Box
                        sx={{
                            flex: 1,
                            overflowY: "auto",
                            minHeight: 0,
                            pb: 20,
                            backgroundColor: "#fff",
                        }}
                    >
                        {children}
                    </Box>
                </Grid>
                <Grid
                    size={{ lg: 2.5 }}
                    sx={{
                        height: "100vh",
                        overflowY: "auto",
                        borderLeft: "1px solid #e8eaed",
                        backgroundColor: "#fff",
                    }}
                >
                    {nodeName === "Overview" && <DashboardFilters />}
                    {(nodeName === "Main" || nodeName === "Create Sale") && (
                        <DashboardLeaderboards />
                    )}
                </Grid>
            </Grid>
        </AppLayout>
    );
}

export default DashboardLayout;
