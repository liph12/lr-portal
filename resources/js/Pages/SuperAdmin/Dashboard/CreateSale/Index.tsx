import { ReactNode } from "react";
import DashboardLayout from "../../../../components/layouts/DashboardLayout";
import { Container, Box, Grid, Avatar, Typography } from "@mui/material";
import FhDevelopersLogo from "../../../../../assets/fh-logo-dark.png";
import RentphLogo from "../../../../../assets/rentph-logo.png";
import LrLogo from "../../../../../assets/lr-logo.svg";
import StyledButton from "../../../../components/utils/StyledButton";
import Add from "@mui/icons-material/Add";
import { Link } from "@inertiajs/react";

interface SaleOption {
    title: string;
    subTitle: string;
    logo: string;
    href: string;
}

const SALE_OPTIONS: SaleOption[] = [
    {
        title: "Project Sale",
        subTitle: "Developer",
        logo: FhDevelopersLogo,
        href: "/superadmin/dashboard/create-sale/project",
    },
    {
        title: "Rental Sale",
        subTitle: "Rent PH",
        logo: RentphLogo,
        href: "/superadmin/dashboard/create-sale/rental",
    },
    {
        title: "Brokerage Sale",
        subTitle: "Leuterio Realty",
        logo: LrLogo,
        href: "/superadmin/dashboard/create-sale/brokerage",
    },
];

function SaleCard({ title, subTitle, logo, href }: SaleOption) {
    return (
        <Box
            sx={{
                border: "1px solid #e8eaed",
                borderRadius: 3,
                backgroundColor: "#fff",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                transition: "box-shadow 0.2s ease",
                ":hover": {
                    boxShadow:
                        "0 1px 3px rgba(60,64,67,.15), 0 4px 8px rgba(60,64,67,.1)",
                },
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    p: 2.5,
                }}
            >
                <Box>
                    <Typography
                        variant="body2"
                        sx={{ fontWeight: 500, color: "#202124" }}
                    >
                        {title}
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{ color: "#5f6368", fontSize: 13 }}
                    >
                        {subTitle}
                    </Typography>
                </Box>
                <Avatar
                    src={logo}
                    variant="square"
                    sx={{ height: 30, width: "auto" }}
                />
            </Box>
            <StyledButton
                fullWidth
                size="small"
                variant="text"
                endIcon={<Add />}
                LinkComponent={Link}
                href={href}
                sx={{
                    borderRadius: 0,
                    borderTop: "1px solid #e8eaed",
                    textTransform: "none",
                    fontWeight: 500,
                    color: "#1a73e8",
                    py: 1.25,
                    ":hover": { backgroundColor: "#f8fbff" },
                }}
            >
                Create Sale
            </StyledButton>
        </Box>
    );
}

function CreateSale() {
    return (
        <Container sx={{ py: 4 }} maxWidth="lg">
            <Typography
                sx={{
                    fontSize: 18,
                    fontWeight: 500,
                    color: "#202124",
                    mb: 2,
                }}
            >
                Create a sale
            </Typography>
            <Grid container spacing={2}>
                {SALE_OPTIONS.map((opt) => (
                    <Grid key={opt.href} size={{ lg: 4, md: 6, xs: 12 }}>
                        <SaleCard {...opt} />
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
}

CreateSale.layout = (page: ReactNode) => <DashboardLayout children={page} />;

export default CreateSale;
