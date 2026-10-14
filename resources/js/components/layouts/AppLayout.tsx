import { ReactNode, useEffect, useState } from "react";
import { Box, Drawer, useMediaQuery, useTheme } from "@mui/material";
import { usePage } from "@inertiajs/react";
import AppSidebar from "../AppSidebar";
import AppNavbar from "../AppNavbar";
import SideRail from "./SideRail";
import PartnerPosters from "../dashboard/PartnerPosters";
import ViewAsBanner from "../utils/user/ViewAsBanner";
import ImpersonationBanner from "../utils/user/ImpersonationBanner";
import useAuthUser from "../../hooks/useAuthUser";
import useLinkBehaviour from "../../hooks/useLinkBehaviour";
import useAppearance from "../../hooks/useAppearance";

export default function AppLayout({ children }: { children: ReactNode }) {
    const theme = useTheme();
    // noSsr: client-only app, so read the real width on first render and skip a layout jump.
    const desktop = useMediaQuery(theme.breakpoints.up("lg"), { noSsr: true });
    const { url } = usePage();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const user = useAuthUser();
    // AppLayout persists across visits; remount the role-driven panels whenever the effective role changes
    // (sign-in as someone else, or a superadmin's "View as") so nothing from the previous role lingers.
    // Sidebar and rail are siblings, so each needs its own key or React confuses them and duplicates one.
    const roleKey = `${user?.id ?? ""}|${user?.viewing_as ?? ""}|${user?.role ?? ""}|${user?.permissions.join(",") ?? ""}`;

    // Persistent layouts survive navigation, so close the drawer once a link lands.
    useEffect(() => setDrawerOpen(false), [url]);
    useLinkBehaviour(() => setDrawerOpen(false));
    useAppearance();

    return (
        <Box
            sx={{
                // The page's height (html → body → #app), not 100vh: viewport units would grow with the text-size zoom.
                height: "100%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
            }}
        >
            <AppNavbar onMenuClick={() => setDrawerOpen((o) => !o)} />
            <PartnerPosters />
            <ImpersonationBanner />
            <ViewAsBanner />
            <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
                {desktop ? (
                    <AppSidebar key={`sidebar|${roleKey}`} />
                ) : (
                    <Drawer
                        open={drawerOpen}
                        onClose={() => setDrawerOpen(false)}
                        ModalProps={{ keepMounted: true }}
                        slotProps={{ paper: { sx: { borderRight: "none" } } }}
                    >
                        <AppSidebar key={`sidebar|${roleKey}`} />
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
                    {!desktop && <SideRail key={`rail|${roleKey}`} variant="stacked" />}
                </Box>
                {desktop && <SideRail key={`rail|${roleKey}`} variant="rail" />}
            </Box>
        </Box>
    );
}
