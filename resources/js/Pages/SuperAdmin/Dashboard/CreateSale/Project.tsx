import { ReactNode } from "react";
import DashboardLayout from "../../../../components/layouts/DashboardLayout";
import { Container, Box, Typography, Grid } from "@mui/material";
import StyledTextField from "../../../../components/utils/StyledTextField";
import CreateSaleStepperLayout from "../../../../components/layouts/CreateSaleStepperLayout";

function Project() {
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
                <Typography variant="h6" fontWeight="bold" textAlign="center">
                    Create Project Sale
                </Typography>
                <CreateSaleStepperLayout>
                    <Box sx={{ my: 5 }}>
                        <Grid container spacing={2}>
                            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                                <StyledTextField
                                    name="client_firstname"
                                    placeholder="Client Firstname"
                                    value={""}
                                    handleChange={() => {}}
                                />
                            </Grid>
                            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                                <StyledTextField
                                    name="client_lastname"
                                    placeholder="Client Lastname"
                                    value={""}
                                    handleChange={() => {}}
                                />
                            </Grid>
                            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                                <StyledTextField
                                    name="client_email"
                                    placeholder="Client Email"
                                    value={""}
                                    handleChange={() => {}}
                                />
                            </Grid>
                            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                                <StyledTextField
                                    name="client_mobile"
                                    placeholder="Client Mobile"
                                    value={""}
                                    handleChange={() => {}}
                                />
                            </Grid>
                        </Grid>
                    </Box>
                </CreateSaleStepperLayout>
            </Box>
        </Container>
    );
}

Project.layout = (page: ReactNode) => <DashboardLayout children={page} />;

export default Project;
