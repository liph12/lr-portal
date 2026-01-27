import { ReactNode } from "react";
import DashboardLayout from "../../../../components/layouts/DashboardLayout";
import { Container, Box, Typography } from "@mui/material";
import CreateSaleStepperLayout from "../../../../components/layouts/CreateSaleStepperLayout";
import { SalesSource } from "../../../../types/app-data-types";

function Project({ developers }: { developers: SalesSource[] }) {
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
                <CreateSaleStepperLayout salesSources={developers} />
            </Box>
        </Container>
    );
}

Project.layout = (page: ReactNode) => <DashboardLayout children={page} />;

export default Project;
