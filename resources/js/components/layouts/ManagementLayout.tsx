import { ReactNode } from "react";
import { Box, Container } from "@mui/material";
import { DashboardCustomizeRounded } from "@mui/icons-material";
import { Link, usePage } from "@inertiajs/react";
import AppLayout from "./AppLayout";
import StyledButton from "../utils/StyledButton";
import SectionTitle from "../utils/SectionTitle";
import useAuthUser from "../../hooks/useAuthUser";
import { hasAnyPermission } from "../../helpers/permissions";
import { MANAGEMENT_SECTIONS } from "../management/managementCatalog";

// Management's title and tabs (Overview = the cards, then each section the user may open), around every Management page —
// the same pages serve /superadmin, /admin and /staff management; the receivings are shared pages of their own.
export default function ManagementLayout({ children }: { children: ReactNode }) {
    const user = useAuthUser();
    const base = `/${user?.portal ?? "superadmin"}/management`;
    const path = usePage().url.split("?")[0];
    const tabs = [
        { name: "Overview", href: base, icon: DashboardCustomizeRounded },
        ...MANAGEMENT_SECTIONS.filter((s) => hasAnyPermission(user?.permissions, s.permission)).map((s) => ({ name: s.name, href: s.href(base), icon: s.icon })),
    ];

    return (
        <AppLayout>
            <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>
                <SectionTitle title="Management" subtitle="Agents, teams, transfers and commission receiving." />
                <Box
                    component="nav"
                    aria-label="Management sections"
                    sx={{ display: "flex", gap: 1, mb: 3, overflowX: "auto", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}
                >
                    {tabs.map((tab) => {
                        const active = path === tab.href;
                        return (
                            <Link key={tab.name} href={tab.href} style={{ textDecoration: "none" }} aria-current={active ? "page" : undefined}>
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
