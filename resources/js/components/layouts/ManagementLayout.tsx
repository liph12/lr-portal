import { ReactNode } from "react";
import { Box, Container } from "@mui/material";
import { GroupsRounded, Diversity3Rounded, BadgeRounded, SwapHorizRounded } from "@mui/icons-material";
import { Link, usePage } from "@inertiajs/react";
import AppLayout from "./AppLayout";
import StyledButton from "../utils/StyledButton";
import SectionTitle from "../utils/SectionTitle";
import useAuthUser from "../../hooks/useAuthUser";

const TABS = [
    { name: "Agents", path: "/agents", icon: BadgeRounded },
    { name: "Teams", path: "/teams", icon: GroupsRounded },
    { name: "Sub-teams", path: "/sub-teams", icon: Diversity3Rounded },
    { name: "Team transfers", path: "/transfers", icon: SwapHorizRounded },
];

// Management tabs; the same pages serve /superadmin/management and /admin/management.
export default function ManagementLayout({ children }: { children: ReactNode }) {
    const base = `/${useAuthUser()?.portal ?? "superadmin"}/management`;
    const path = usePage().url.split("?")[0];

    return (
        <AppLayout>
            <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>
                <SectionTitle title="Management" subtitle="Teams, sub-teams, agents and transfers." />
                <Box
                    component="nav"
                    aria-label="Management sections"
                    sx={{ display: "flex", gap: 1, mb: 3, overflowX: "auto", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}
                >
                    {TABS.map((tab) => {
                        const href = base + tab.path;
                        const active = path === href;
                        return (
                            <Link key={tab.name} href={href} style={{ textDecoration: "none" }} aria-current={active ? "page" : undefined}>
                                <StyledButton
                                    startIcon={<tab.icon />}
                                    size="small"
                                    variant="text"
                                    sx={{
                                        borderRadius: 99,
                                        whiteSpace: "nowrap",
                                        px: 2,
                                        fontWeight: 500,
                                        color: active ? "var(--lr-primary)" : "var(--lr-text-secondary)",
                                        backgroundColor: active ? "var(--lr-primary-soft)" : "transparent",
                                        ":hover": { backgroundColor: active ? "var(--lr-primary-soft)" : "var(--lr-surface-container)" },
                                    }}
                                >
                                    {tab.name}
                                </StyledButton>
                            </Link>
                        );
                    })}
                </Box>
                {children}
            </Container>
        </AppLayout>
    );
}
