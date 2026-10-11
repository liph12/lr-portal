import { ReactNode } from "react";
import { Box, Container, Grid, Typography } from "@mui/material";
import { ArrowForwardRounded, ApartmentRounded } from "@mui/icons-material";
import { Link } from "@inertiajs/react";
import DashboardLayout from "../../../../components/layouts/DashboardLayout";
import SectionTitle from "../../../../components/utils/SectionTitle";

const REPORTS = [
    {
        title: "Developer Reports",
        description: "Sales grouped by developer and project.",
        href: "/dashboard/view-sales/developer",
        icon: ApartmentRounded,
    },
];

function Reports() {
    return (
        <Container sx={{ py: { xs: 3, sm: 4 } }} maxWidth="lg">
            <SectionTitle title="View sales" subtitle="Pick a report to open." />
            <Grid container spacing={2}>
                {REPORTS.map((r) => (
                    <Grid key={r.href} size={{ lg: 4, sm: 6, xs: 12 }}>
                        <Link href={r.href} style={{ textDecoration: "none" }}>
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
                                    ":hover": {
                                        boxShadow:
                                            "0 1px 3px rgba(60,64,67,.15), 0 4px 8px rgba(60,64,67,.1)",
                                    },
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: "50%",
                                        backgroundColor: "var(--lr-primary-soft)",
                                        color: "var(--lr-primary)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                    }}
                                >
                                    <r.icon fontSize="small" />
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 500, color: "var(--lr-text-primary)" }}
                                    >
                                        {r.title}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                                        {r.description}
                                    </Typography>
                                </Box>
                                <ArrowForwardRounded sx={{ color: "var(--lr-text-secondary)" }} fontSize="small" />
                            </Box>
                        </Link>
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
}

Reports.layout = (page: ReactNode) => <DashboardLayout children={page} />;

export default Reports;
