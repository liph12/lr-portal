import { ReactNode } from "react";
import { Box, Container, Grid, Typography } from "@mui/material";
import { AdminPanelSettingsOutlined, ChevronRightRounded } from "@mui/icons-material";
import { Link } from "@inertiajs/react";
import AppLayout from "../../../components/layouts/AppLayout";
import SectionTitle from "../../../components/utils/SectionTitle";

interface SettingsProps {
    counts: { roles: number; permissions: number };
}

function Settings({ counts }: SettingsProps) {
    return (
        <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4 } }}>
            <SectionTitle title="Settings" subtitle="Manage how LR Portal works for your team." />
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
                    <Link href="/superadmin/settings/roles" style={{ textDecoration: "none" }}>
                        <Box
                            sx={{
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
                                <AdminPanelSettingsOutlined />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" sx={{ fontWeight: 500, color: "var(--lr-text-primary)" }}>
                                    Roles & permissions
                                </Typography>
                                <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                                    {counts.roles} roles · {counts.permissions} permissions
                                </Typography>
                            </Box>
                            <ChevronRightRounded sx={{ color: "var(--lr-text-secondary)" }} />
                        </Box>
                    </Link>
                </Grid>
            </Grid>
        </Container>
    );
}

Settings.layout = (page: ReactNode) => <AppLayout children={page} />;

export default Settings;
