import { ReactNode } from "react";
import { Box, Grid, Divider, Container, Stack } from "@mui/material";
import DashboardLayout from "../../../../components/layouts/DashboardLayout";
import DashboardCardOverview from "../../../../components/cards/DashboardCardOverview";
import PeopleNetworkIcon from "../../../../../assets/icons/network-gray.png";
import PeopleExamIcon from "../../../../../assets/icons/exam-gray.png";
import SeminarIcon from "../../../../../assets/icons/seminar-gray.png";
import ActiveIcon from "../../../../../assets/icons/active-users-gray.png";
import SalesIcon from "../../../../../assets/icons/sales-gray.png";

interface Recruits {
    total: number;
    difference: number;
    nao: {
        total: number;
        difference: number;
    };
    fire: {
        total: number;
        difference: number;
    };
}

interface OverviewProps {
    recruits: Recruits;
}

function Overview({ recruits }: OverviewProps) {
    return (
        <Container sx={{ py: 3 }} maxWidth="lg">
            <Box
                sx={{
                    overflowY: "auto",
                    height: "100vh",
                    width: "100%",
                    scrollBehavior: "smooth",
                    pr: 3,
                }}
            >
                <Grid container spacing={1}>
                    <Grid size={{ lg: 4, md: 6, sm: 12 }}>
                        <DashboardCardOverview
                            title="Total Recruits"
                            value={recruits.total}
                            rateType={
                                recruits.difference >= 0 ? "success" : "error"
                            }
                            rateValue={`${Math.abs(recruits.difference).toFixed(
                                2
                            )}%`}
                            rateLabel="vs last year"
                            footerLabel="01 January - 31 December"
                            iconSrc={PeopleNetworkIcon}
                        />
                    </Grid>
                    <Grid size={{ lg: 4, md: 6, sm: 12 }}>
                        <DashboardCardOverview
                            title="Recruits with NAO"
                            value={recruits.nao.total}
                            rateType={
                                recruits.nao.difference >= 0
                                    ? "success"
                                    : "error"
                            }
                            rateValue={`${Math.abs(
                                recruits.nao.difference
                            ).toFixed(2)}%`}
                            rateLabel="vs total recruits"
                            footerLabel="01 January - 31 December"
                            iconSrc={SeminarIcon}
                        />
                    </Grid>
                    <Grid size={{ lg: 4, md: 6, sm: 12 }}>
                        <DashboardCardOverview
                            title="Recruits taken FIRE"
                            value={recruits.fire.total}
                            rateType={
                                recruits.fire.difference >= 0
                                    ? "success"
                                    : "error"
                            }
                            rateValue={`${Math.abs(
                                recruits.fire.difference
                            ).toFixed(2)}%`}
                            rateLabel="vs with NAO"
                            footerLabel="01 January - 31 December"
                            iconSrc={PeopleExamIcon}
                        />
                    </Grid>
                    <Grid size={{ lg: 4, md: 6, sm: 12 }}>
                        <DashboardCardOverview
                            title="Active Agents"
                            value={6000}
                            rateLabel="Agents with sales"
                            footerLabel="Recent activity (last 6 months)"
                            iconSrc={ActiveIcon}
                        />
                    </Grid>
                    <Grid size={{ lg: 4, md: 6, sm: 12 }}>
                        <DashboardCardOverview
                            title="Sales"
                            value="15,000,000,000"
                            rateType="success"
                            rateValue={`${30}%`}
                            rateLabel="vs last year"
                            footerLabel="Project, Brokerage and Rental"
                            iconSrc={SalesIcon}
                        />
                    </Grid>
                </Grid>
                <Box height={100} />
            </Box>
        </Container>
    );
}

Overview.layout = (page: ReactNode) => <DashboardLayout children={page} />;

export default Overview;
