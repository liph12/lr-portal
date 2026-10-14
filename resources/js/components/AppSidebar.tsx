import { Box, Typography } from "@mui/material";
import { Link } from "@inertiajs/react";
import useSidebarRoutes from "../hooks/useSidebarRoutes";
import useAuthUser from "../hooks/useAuthUser";
import SidebarProfile from "./utils/user/SidebarProfile";

const GROUP_HEADING = {
    color: "var(--lr-text-secondary)",
    px: 3.5,
    mb: 0.75,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    display: "block",
} as const;

export default function AppSidebar() {
    const routes = useSidebarRoutes();
    const isSuperadmin = useAuthUser()?.portal === "superadmin";

    return (
        <Box
            sx={{
                width: 270,
                flexShrink: 0,
                height: "100%",
                backgroundColor: "var(--lr-surface)",
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
            <Box sx={{ py: 1.5 }}>
                {routes.map((r, k) => {
                    // Group headings belong to the superadmin menu's layout; other portals' menus are short and flat.
                    const ADMINISTRATOR_GROUP = isSuperadmin && k === 0;
                    const STAFF_GROUP = isSuperadmin && r.path === "/superadmin/accounting";

                    return (
                        <Box key={k}>
                            {ADMINISTRATOR_GROUP && (
                                <Typography
                                    sx={{ ...GROUP_HEADING, mt: 1 }}
                                    variant="caption"
                                >
                                    Administrator
                                </Typography>
                            )}
                            {STAFF_GROUP && (
                                <Typography
                                    sx={{ ...GROUP_HEADING, mt: 2.5 }}
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
                                        position: "relative",
                                        mx: 1.5,
                                        pl: 2,
                                        pr: 1.5,
                                        py: 1.1,
                                        mb: 0.25,
                                        cursor: "pointer",
                                        borderRadius: 2,
                                        color: r.active
                                            ? "var(--lr-primary)"
                                            : "var(--lr-text-body)",
                                        backgroundColor: r.active
                                            ? "var(--lr-primary-soft)"
                                            : "transparent",
                                        fontWeight: r.active ? 600 : 500,
                                        transition: "background-color 0.15s, color 0.15s",
                                        ":hover": {
                                            backgroundColor: r.active
                                                ? "var(--lr-primary-soft)"
                                                : "var(--lr-surface-hover)",
                                        },
                                        // The brand red marks where you are.
                                        "::before": r.active
                                            ? { content: '""', position: "absolute", left: 0, top: 8, bottom: 8, width: 3, borderRadius: 3, backgroundColor: "var(--lr-accent)" }
                                            : undefined,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1.75,
                                        "& svg": {
                                            color: r.active
                                                ? "var(--lr-primary)"
                                                : "var(--lr-text-secondary)",
                                        },
                                    }}
                                    component="div"
                                    variant="body2"
                                >
                                    {/* Every top-level menu item has an icon; children (breadcrumbs, search) may not. */}
                                    {r.icon && <r.icon fontSize="small" />} {r.name}
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
                                                color: "var(--lr-on-accent)",
                                                backgroundColor: "var(--lr-accent)",
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
