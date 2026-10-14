import { useState } from "react";
import { Box, Divider, IconButton } from "@mui/material";
import AppBreadcrumbs from "./utils/AppBreadcrumbs";
import ProfileMenu from "./utils/user/ProfileMenu";
import GlobalSearch from "./utils/search/GlobalSearch";
import AppLogo from "./utils/AppLogo";
import ThemeModeToggle from "./utils/ThemeModeToggle";
import {
    MenuRounded,
    SearchRounded,
    NotificationsOutlined,
    ArrowBackRounded,
} from "@mui/icons-material";

interface AppNavbarProps {
    onMenuClick: () => void;
}

export default function AppNavbar({ onMenuClick }: AppNavbarProps) {
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

    return (
        <Box component="header" sx={{ flexShrink: 0 }}>
            <Box
                sx={{
                    py: 1,
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    backgroundColor: "var(--lr-surface)",
                    position: "relative",
                }}
            >
                {mobileSearchOpen && (
                    <Box
                        sx={{
                            position: "absolute",
                            inset: 0,
                            zIndex: 1,
                            display: { xs: "flex", md: "none" },
                            alignItems: "center",
                            gap: 1,
                            px: 1,
                            backgroundColor: "var(--lr-surface)",
                        }}
                    >
                        <IconButton
                            aria-label="Close search"
                            onClick={() => setMobileSearchOpen(false)}
                            sx={{ color: "var(--lr-text-secondary)" }}
                        >
                            <ArrowBackRounded />
                        </IconButton>
                        <GlobalSearch autoFocus onDone={() => setMobileSearchOpen(false)} />
                    </Box>
                )}

                {/* Left: menu + logo */}
                <Box
                    sx={{
                        display: "flex",
                        gap: { xs: 0.5, sm: 1.5 },
                        alignItems: "center",
                        px: { xs: 1, sm: 2 },
                        flexShrink: 0,
                    }}
                >
                    <IconButton
                        aria-label="Open menu"
                        onClick={onMenuClick}
                        sx={{ color: "var(--lr-text-secondary)" }}
                    >
                        <MenuRounded />
                    </IconButton>
                    <AppLogo sx={{ width: 70 }} />
                </Box>

                {/* Center: search */}
                <Box
                    sx={{
                        display: { xs: "none", md: "flex" },
                        justifyContent: "center",
                        alignItems: "center",
                        flex: 1,
                        px: 2,
                    }}
                >
                    <GlobalSearch />
                </Box>

                {/* Right: actions + avatar */}
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: { xs: 0, sm: 0.5 },
                        px: { xs: 1, sm: 1.5 },
                        flexShrink: 0,
                        ml: { xs: "auto", md: 0 },
                    }}
                >
                    <IconButton
                        aria-label="Search"
                        onClick={() => setMobileSearchOpen(true)}
                        sx={{ color: "var(--lr-text-secondary)", display: { md: "none" } }}
                    >
                        <SearchRounded />
                    </IconButton>
                    <ThemeModeToggle />
                    <IconButton sx={{ color: "var(--lr-text-secondary)" }}>
                        <NotificationsOutlined />
                    </IconButton>
                    <ProfileMenu />
                </Box>
            </Box>
            <Divider sx={{ borderColor: "var(--lr-border)" }} />
            <Box
                sx={{
                    px: { xs: 2, sm: 3 },
                    py: 0.75,
                    backgroundColor: "var(--lr-surface)",
                }}
            >
                <AppBreadcrumbs />
            </Box>
            <Divider sx={{ borderColor: "var(--lr-border)" }} />
        </Box>
    );
}
