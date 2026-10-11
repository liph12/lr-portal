import { ReactNode, useEffect, useState } from "react";
import { Box, Drawer, useMediaQuery, useTheme } from "@mui/material";
import { usePage } from "@inertiajs/react";
import AppSidebar from "../AppSidebar";
import AppNavbar from "../AppNavbar";
import SideRail from "./SideRail";
import ViewAsBanner from "../utils/user/ViewAsBanner";

export default function AppLayout({ children }: { children: ReactNode }) {
    const theme = useTheme();
    // noSsr: client-only app, so read the real width on first render and skip a layout jump.
    const desktop = useMediaQuery(theme.breakpoints.up("lg"), { noSsr: true });
    const { url } = usePage();
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Persistent layouts survive navigation, so close the drawer once a link lands.
    useEffect(() => setDrawerOpen(false), [url]);

    return (
        <Box
            sx={{
                height: "100vh",
                "@supports (height: 100dvh)": { height: "100dvh" },
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
            }}
        >
            <AppNavbar onMenuClick={() => setDrawerOpen((o) => !o)} />
            <ViewAsBanner />
            <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
                {desktop ? (
                    <AppSidebar />
                ) : (
                    <Drawer
                        open={drawerOpen}
                        onClose={() => setDrawerOpen(false)}
                        ModalProps={{ keepMounted: true }}
                        slotProps={{ paper: { sx: { borderRight: "none" } } }}
                    >
                        <AppSidebar />
                    </Drawer>
                )}
                <Box
                    component="main"
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        overflowY: "auto",
                        overflowX: "hidden",
                        scrollBehavior: "smooth",
                    }}
                >
                    {children}
                    {!desktop && <SideRail variant="stacked" />}
                </Box>
                {desktop && <SideRail variant="rail" />}
            </Box>
        </Box>
    );
}
