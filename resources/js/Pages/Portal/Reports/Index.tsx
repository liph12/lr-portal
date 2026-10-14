import { ReactNode } from "react";
import { Box, Container, Grid, Typography } from "@mui/material";
import { ChevronRightRounded } from "@mui/icons-material";
import { Link } from "@inertiajs/react";
import AppLayout from "../../../components/layouts/AppLayout";
import SectionTitle from "../../../components/utils/SectionTitle";
import SpotIcon from "../../../components/utils/SpotIcon";
import { REPORTS } from "../../../components/reports/reportCatalog";

// Reports: one card per report, so it's obvious where each kind of data lives.
function Reports({ available }: { available: string[] }) {
    return (
        <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4 } }}>
            <SectionTitle title="Reports" subtitle="Pick a report. Each one has its own date range and statistics." />
            <Grid container spacing={2}>
                {REPORTS.filter((r) => available.indexOf(r.slug) !== -1).map(({ slug, title, description, art }) => (
                    <Grid key={slug} size={{ xs: 12, sm: 6, lg: 4 }}>
                        <Link href={`/reports/${slug}`} style={{ textDecoration: "none" }}>
                            <Box
                                sx={{
                                    height: "100%",
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: 2,
                                    p: 2.5,
                                    border: "1px solid var(--lr-border)",
                                    borderRadius: 3,
                                    backgroundColor: "var(--lr-surface)",
                                    transition: "box-shadow 0.2s ease",
                                    ":hover": { boxShadow: "0 1px 3px rgba(60,64,67,.15), 0 4px 8px rgba(60,64,67,.1)" },
                                }}
                            >
                                <SpotIcon name={art} size={52} />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body1" sx={{ fontWeight: 500, color: "var(--lr-text-primary)" }}>
                                        {title}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", mt: 0.5 }}>
                                        {description}
                                    </Typography>
                                </Box>
                                <ChevronRightRounded sx={{ color: "var(--lr-text-secondary)", alignSelf: "center" }} />
                            </Box>
                        </Link>
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
}

Reports.layout = (page: ReactNode) => <AppLayout children={page} />;

export default Reports;
