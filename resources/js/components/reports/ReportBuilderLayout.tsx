import { ReactNode } from "react";
import { Box, Container } from "@mui/material";
import { Link, usePage } from "@inertiajs/react";
import AppLayout from "../layouts/AppLayout";
import StyledButton from "../utils/StyledButton";
import SectionTitle from "../utils/SectionTitle";

const TABS = [
    { name: "Sales", href: "/superadmin/report-builder/sales" },
    { name: "Recruits & Onboarding", href: "/superadmin/report-builder/recruits" },
];

// Report Builder's frame: a title and the two domains as tabs, around whichever one's dynamic breakdown is showing.
export default function ReportBuilderLayout({ children }: { children: ReactNode }) {
    const path = usePage().url.split("?")[0];

    return (
        <AppLayout>
            <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>
                <SectionTitle title="Report Builder" subtitle="Pick a view, filter it, and export the result — a report built on the spot, not a fixed table." />
                <Box
                    component="nav"
                    aria-label="Report Builder domains"
                    sx={{ display: "flex", gap: 1, mb: 3, overflowX: "auto", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}
                >
                    {TABS.map((tab) => {
                        const active = path === tab.href;
                        return (
                            <Link key={tab.href} href={tab.href} style={{ textDecoration: "none" }} aria-current={active ? "page" : undefined}>
                                <StyledButton
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
