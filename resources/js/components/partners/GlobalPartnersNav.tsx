import { Box } from "@mui/material";
import { GroupsRounded, InsightsRounded } from "@mui/icons-material";
import { Link, usePage } from "@inertiajs/react";
import StyledButton from "../utils/StyledButton";
import useAuthUser from "../../hooks/useAuthUser";
import { hasAnyPermission } from "../../helpers/permissions";

const TABS = [
    { name: "Partners", path: "/global-partners", icon: GroupsRounded },
    { name: "Statistics", path: "/global-partners/statistics", icon: InsightsRounded, permission: "view_global_partner_statistics" },
];

// Tabs for Global Partners (the list to confirm, and their international-sales statistics).
export default function GlobalPartnersNav() {
    const path = usePage().url.split("?")[0];
    const permissions = useAuthUser()?.permissions;

    return (
        <Box component="nav" aria-label="Global partners sections" sx={{ display: "flex", gap: 1, mb: 3 }}>
            {TABS.filter((tab) => hasAnyPermission(permissions, tab.permission)).map((tab) => {
                const active = path === tab.path;
                return (
                    <Link key={tab.path} href={tab.path} style={{ textDecoration: "none" }} aria-current={active ? "page" : undefined}>
                        <StyledButton
                            startIcon={<tab.icon />}
                            size="small"
                            variant="text"
                            sx={{
                                px: 2,
                                borderRadius: 99,
                                color: active ? "var(--lr-primary)" : "var(--lr-text-body)",
                                backgroundColor: active ? "var(--lr-primary-soft)" : "transparent",
                                fontWeight: active ? 600 : 500,
                            }}
                        >
                            {tab.name}
                        </StyledButton>
                    </Link>
                );
            })}
        </Box>
    );
}
