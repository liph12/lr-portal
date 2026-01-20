import { ReactNode } from "react";
import { Box, Divider, Grid } from "@mui/material";
import { useAppRoutes } from "../../appdata";
import { isRouteActive } from "../../helpers/routeMatch";
import { usePage, Link } from "@inertiajs/react";
import StyledButton from "../utils/StyledButton";
import AppLayout from "./AppLayout";
import DashboardFilters from "../utils/DashboardFilters";
import DashboardLeaderboards from "../utils/DashboardLeaderboards";

const DASHBOARD_ROUTES = useAppRoutes.find((r) => r.name === "Dashboard");

function DashboardLayout({ children }: { children: ReactNode }) {
    const { url } = usePage();
    const routeNodes = DASHBOARD_ROUTES.children;
    const nodeName = routeNodes.find((r) => url.includes(r.path)).name;

    return (
        <AppLayout>
            <Grid container>
                <Grid size={{ lg: 9.5 }}>
                    <Box sx={{ pt: 1, px: 2, display: "flex", gap: 2 }}>
                        {routeNodes.map((r) => (
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
                                        borderBottom: isRouteActive(url, r.path)
                                            ? "3px solid rgb(203, 57, 57)"
                                            : "none",
                                        borderRadius: 0,
                                        color: "#777",
                                    }}
                                >
                                    {r.name}
                                </StyledButton>
                            </Link>
                        ))}
                    </Box>
                    <Divider />
                    {children}
                </Grid>
                <Grid size={{ lg: 2.5 }}>
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
