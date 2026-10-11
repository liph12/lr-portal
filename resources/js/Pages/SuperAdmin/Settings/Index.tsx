import { ElementType, ReactNode } from "react";
import { Box, Container, Grid, Typography } from "@mui/material";
import { AdminPanelSettingsOutlined, ChevronRightRounded, EventBusyOutlined, TuneRounded } from "@mui/icons-material";
import { Link } from "@inertiajs/react";
import AppLayout from "../../../components/layouts/AppLayout";
import SectionTitle from "../../../components/utils/SectionTitle";
import { SalesEncodingState } from "../../../types/app-data-types";

interface SettingsProps {
    counts: { roles: number; permissions: number; sales_cutoffs: number };
    salesEncoding: SalesEncodingState;
}

interface SettingsCardProps {
    href: string;
    icon: ElementType;
    title: string;
    detail: string;
}

function SettingsCard({ href, icon: Icon, title, detail }: SettingsCardProps) {
    return (
        <Link href={href} style={{ textDecoration: "none", display: "block", height: "100%" }}>
            <Box
                sx={{
                    // Equal heights across a row, whatever the detail line's length.
                    height: "100%",
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 2.5,
                    border: "1px solid var(--lr-border)",
                    borderRadius: 3,
                    backgroundColor: "var(--lr-surface)",
                    transition: "box-shadow 0.2s ease",
                    ":hover": { boxShadow: "0 1px 3px rgba(60,64,67,.15), 0 4px 8px rgba(60,64,67,.1)" },
                }}
            >
                <Box
                    sx={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--lr-primary)",
                        backgroundColor: "var(--lr-primary-soft)",
                    }}
                >
                    <Icon />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: "var(--lr-text-primary)" }}>
                        {title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                        {detail}
                    </Typography>
                </Box>
                <ChevronRightRounded sx={{ color: "var(--lr-text-secondary)" }} />
            </Box>
        </Link>
    );
}

function Settings({ counts, salesEncoding }: SettingsProps) {
    return (
        <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4 } }}>
            <SectionTitle title="Settings" subtitle="Manage how LR Portal works for your team." />
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
                    <SettingsCard
                        href="/superadmin/settings/roles"
                        icon={AdminPanelSettingsOutlined}
                        title="Roles & permissions"
                        detail={`${counts.roles} roles · ${counts.permissions} permissions`}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
                    <SettingsCard
                        href="/superadmin/settings/sales-cutoffs"
                        icon={EventBusyOutlined}
                        title="Sales cutoff"
                        detail={`${counts.sales_cutoffs} monthly cutoffs · recording ${salesEncoding.enabled ? "on" : "off"}`}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
                    <SettingsCard href="/settings/preferences" icon={TuneRounded} title="Preferences" detail="Theme, text size and links" />
                </Grid>
            </Grid>
        </Container>
    );
}

Settings.layout = (page: ReactNode) => <AppLayout children={page} />;

export default Settings;
