import { useState } from "react";
import { Box, Collapse, Divider, Typography } from "@mui/material";
import { ChevronRightRounded } from "@mui/icons-material";
import { Link, usePage } from "@inertiajs/react";
import useAuthUser from "../hooks/useAuthUser";
import { SharedProps } from "../types";
import useSidebarRoutes from "../hooks/useSidebarRoutes";
import UserOnlineAvatar from "./utils/user/UserOnlineAvatar";
import SidebarProfile from "./utils/user/SidebarProfile";

export default function AppSidebar() {
    const routes = useSidebarRoutes();
    const authUser = useAuthUser();
    const { online_users: users = [] } = usePage<SharedProps>().props;
    const showOnline = !!authUser?.can.search_users;
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
                {showOnline && (
                    <>
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
                                    color: "var(--lr-text-secondary)",
                                    transition: "transform 0.15s",
                                    transform: onlineOpen
                                        ? "rotate(90deg)"
                                        : "rotate(0deg)",
                                }}
                            />
                            <Typography
                                variant="caption"
                                sx={{ color: "var(--lr-text-secondary)", fontWeight: 500 }}
                            >
                                Online users ({users.filter((u) => u.online).length})
                            </Typography>
                        </Box>

                        <Collapse in={onlineOpen} timeout="auto" unmountOnExit>
                            <Box sx={{ pl: 1 }}>
                                {users.length === 0 && (
                                    <Typography
                                        variant="caption"
                                        component="p"
                                        sx={{ px: 3, py: 0.5, color: "var(--lr-text-secondary)" }}
                                    >
                                        No one else is signed in right now.
                                    </Typography>
                                )}
                                {users.map((u) => (
                                    <UserOnlineAvatar
                                        key={u.id}
                                        avatar={u.avatar}
                                        name={u.name}
                                        online={u.online}
                                        role={u.role}
                                        timestamp={u.last_seen}
                                    />
                                ))}
                            </Box>
                        </Collapse>
                    </>
                )}
            </Box>
        </Box>
    );
}
