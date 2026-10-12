import { Box, Typography } from "@mui/material";
import { Link } from "@inertiajs/react";
import useSidebarRoutes from "../hooks/useSidebarRoutes";
import useAuthUser from "../hooks/useAuthUser";
import SidebarProfile from "./utils/user/SidebarProfile";

export default function AppSidebar() {
    const routes = useSidebarRoutes();
    const isSuperadmin = useAuthUser()?.portal === "superadmin";

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
                    // Group headings belong to the superadmin menu's layout; other portals' menus are short and flat.
                    const ADMINISTRATOR_GROUP = isSuperadmin && k === 0;
                    const STAFF_GROUP = isSuperadmin && r.path === "/superadmin/accounting";

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

                            {/* Loaded on hover and kept a minute, so opening (or coming back to) a section is instant; any save clears it (AppFeedback). */}
                            <Link
                                href={r.path}
                                prefetch
                                cacheFor="1m"
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
                                    {!!r.badge && (
                                        <Box
                                            component="span"
                                            aria-label={`${r.badge} waiting`}
                                            sx={{
                                                ml: "auto",
                                                minWidth: 22,
                                                height: 20,
                                                px: 0.75,
                                                borderRadius: 99,
                                                fontSize: 11,
                                                fontWeight: 700,
                                                lineHeight: "20px",
                                                textAlign: "center",
                                                color: "var(--lr-on-primary)",
                                                backgroundColor: "var(--lr-error)",
                                            }}
                                        >
                                            {r.badge > 999 ? "999+" : r.badge}
                                        </Box>
                                    )}
                                </Typography>
                            </Link>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
}
