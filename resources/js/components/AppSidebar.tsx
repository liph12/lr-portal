import { useState } from "react";
import { Box, Collapse, Divider, Typography } from "@mui/material";
import { ChevronRightRounded, LogoutRounded } from "@mui/icons-material";
import { Link } from "@inertiajs/react";
import useSidebarRoutes from "../hooks/useSidebarRoutes";
import UserOnlineAvatar from "./utils/user/UserOnlineAvatar";
import SidebarProfile from "./utils/user/SidebarProfile";
import { User } from "./utils/user/UserOnlineAvatar";

const users: User[] = [
    {
        id: 0,
        avatar: "https://leuteriorealty.com/memberfiles/0/20240419043008.jpg",
        name: "Anthony Gerard Leuterio",
        online: true,
        role: "Superadmin",
        timestamp: "0m",
    },
    {
        id: 1,
        avatar: "https://filipinohomes123.s3.ap-southeast-1.amazonaws.com/filipinohomes-compressed-from-old/cd23c6fa-51a9-40b9-926b-422a97739987.webp",
        name: "Philip Libres",
        online: false,
        role: "Staff",
        timestamp: "45m",
    },
];

export default function AppSidebar() {
    const routes = useSidebarRoutes();
    const [onlineOpen, setOnlineOpen] = useState(true);

    return (
        <Box
            sx={{
                width: 270,
                flexShrink: 0,
                height: "100%",
                backgroundColor: "var(--lr-surface-dim)",
                borderRight: "1px solid var(--lr-border)",
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
                overflowX: "hidden",
                scrollBehavior: "smooth",
            }}
        >
            <SidebarProfile />

            {/* Menu */}
            <Box sx={{ py: 2, pr: 1.5 }}>
                {routes.map((r, k) => {
                    const ADMINISTRATOR_GROUP = k === 0;
                    const STAFF_GROUP = k === 3;

                    return (
                        <Box key={k}>
                            {ADMINISTRATOR_GROUP && (
                                <Typography
                                    sx={{
                                        color: "var(--lr-text-secondary)",
                                        px: 3,
                                        mt: 1,
                                        mb: 1,
                                        fontWeight: 500,
                                        letterSpacing: 0.3,
                                        display: "block",
                                    }}
                                    variant="caption"
                                >
                                    Administrator
                                </Typography>
                            )}
                            {STAFF_GROUP && (
                                <Typography
                                    sx={{
                                        color: "var(--lr-text-secondary)",
                                        px: 3,
                                        mt: 2,
                                        mb: 1,
                                        fontWeight: 500,
                                        letterSpacing: 0.3,
                                        display: "block",
                                    }}
                                    variant="caption"
                                >
                                    Staff
                                </Typography>
                            )}

                            <Link
                                href={r.path}
                                style={{ textDecoration: "none" }}
                            >
                                <Typography
                                    sx={{
                                        pl: 3,
                                        pr: 2,
                                        py: 1.5,
                                        mb: 0.5,
                                        cursor: "pointer",
                                        // flush-left, rounded right cap
                                        borderTopRightRadius: 99,
                                        borderBottomRightRadius: 99,
                                        color: r.active
                                            ? "var(--lr-primary)"
                                            : "var(--lr-text-body)",
                                        backgroundColor: r.active
                                            ? "var(--lr-primary-soft-strong)"
                                            : "transparent",
                                        fontWeight: 500,
                                        transition: "0.15s",
                                        ":hover": {
                                            backgroundColor: r.active
                                                ? "var(--lr-primary-soft-strong)"
                                                : "var(--lr-surface-hover)",
                                        },
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 2,
                                        "& svg": {
                                            color: r.active
                                                ? "var(--lr-primary)"
                                                : "var(--lr-text-secondary)",
                                        },
                                    }}
                                    component="div"
                                    variant="body2"
                                >
                                    <r.icon fontSize="small" /> {r.name}
                                </Typography>
                            </Link>
                        </Box>
                    );
                })}
            </Box>

            {/* Online users — flows right after the routes */}
            <Box sx={{ pr: 1.5, pb: 2 }}>
                <Divider
                    sx={{ my: 1, borderColor: "var(--lr-border)", ml: 3 }}
                />

                <Box
                    role="button"
                    aria-expanded={onlineOpen}
                    onClick={() => setOnlineOpen((open) => !open)}
                    sx={{
                        color: "var(--lr-text-secondary)",
                        px: 3,
                        mb: 1,
                        fontWeight: 500,
                        display: "block",
                    }}
                >
                    <ChevronRightRounded
                        fontSize="small"
                        sx={{
                            // glyph is centered in its box; pull it to the icon column's edge
                            ml: -0.5,
                            mr: 0.5,
                            color: "#5f6368",
                            transition: "transform 0.15s",
                            transform: onlineOpen
                                ? "rotate(90deg)"
                                : "rotate(0deg)",
                        }}
                    />
                    <Typography
                        variant="caption"
                        sx={{ color: "#5f6368", fontWeight: 500 }}
                    >
                        Online users ({users.length})
                    </Typography>
                </Box>

                <Collapse in={onlineOpen} timeout="auto" unmountOnExit>
                    <Box sx={{ pl: 1 }}>
                        {users.map((u) => (
                            <UserOnlineAvatar
                                key={u.id}
                                avatar={u.avatar}
                                name={u.name}
                                online={u.online}
                                role={u.role}
                                timestamp={u.timestamp}
                            />
                        ))}
                    </Box>
                </Collapse>

                <Divider sx={{ my: 1, borderColor: "#e8eaed", ml: 3 }} />

                <Box
                    role="button"
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        pl: 3,
                        pr: 2,
                        py: 0.75,
                        cursor: "pointer",
                        userSelect: "none",
                        borderTopRightRadius: 99,
                        borderBottomRightRadius: 99,
                        ":hover": { backgroundColor: "#fce8e6" },
                    }}
                >
                    <LogoutRounded fontSize="small" sx={{ color: "#d93025" }} />
                    <Typography
                        variant="caption"
                        sx={{ color: "#d93025", fontWeight: 500 }}
                    >
                        Logout
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}
