import { useState } from "react";
import { Box, Divider, Avatar, IconButton, InputBase } from "@mui/material";
import AppBreadcrumbs from "./utils/AppBreadcrumbs";
import useAuthUser from "../hooks/useAuthUser";
import { getAvatarColor, getInitials } from "../helpers/userAvatar";
import AppLogo from "./utils/AppLogo";
import ThemeModeToggle from "./utils/ThemeModeToggle";
import {
    MenuRounded,
    SearchRounded,
    MoreVertRounded,
    NotificationsOutlined,
    ArrowBackRounded,
} from "@mui/icons-material";

interface AppNavbarProps {
    onMenuClick: () => void;
}

function SearchField({ autoFocus = false }: { autoFocus?: boolean }) {
    return (
        <Box
            sx={{
                width: "100%",
                maxWidth: 720,
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 2,
                py: 0.75,
                borderRadius: 99,
                backgroundColor: "var(--lr-surface-container)",
                transition: "background-color 0.15s, box-shadow 0.15s",
                ":focus-within": {
                    backgroundColor: "var(--lr-surface)",
                    boxShadow: "0 1px 3px rgba(60,64,67,.2)",
                },
            }}
        >
            <SearchRounded sx={{ color: "var(--lr-text-secondary)" }} fontSize="small" />
            <InputBase
                fullWidth
                size="small"
                autoFocus={autoFocus}
                placeholder="Search (/) for resources, sales, agents, developers & more"
                sx={{
                    fontSize: 15,
                    fontWeight: 400,
                    color: "var(--lr-text-body)",
                    "& .MuiInputBase-input::placeholder": {
                        color: "var(--lr-text-secondary)",
                        opacity: 1,
                        textOverflow: "ellipsis",
                    },
                }}
            />
        </Box>
    );
}

export default function AppNavbar({ onMenuClick }: AppNavbarProps) {
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const user = useAuthUser();

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
                        <SearchField autoFocus />
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
                    <SearchField />
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
                    <IconButton
                        sx={{ color: "var(--lr-text-secondary)", display: { xs: "none", sm: "inline-flex" } }}
                    >
                        <MoreVertRounded />
                    </IconButton>
                    <Avatar
                        alt={user?.name}
                        sx={{
                            height: 36,
                            width: 36,
                            ml: 0.5,
                            fontSize: 15,
                            backgroundColor: user ? getAvatarColor(user.name) : undefined,
                        }}
                    >
                        {user ? getInitials(user.name) : null}
                    </Avatar>
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
