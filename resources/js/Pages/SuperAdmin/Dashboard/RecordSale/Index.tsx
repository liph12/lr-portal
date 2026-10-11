import { ReactNode } from "react";
import DashboardLayout from "../../../../components/layouts/DashboardLayout";
import { Container, Box, Grid, Typography } from "@mui/material";
import FlashBanner from "../../../../components/utils/FlashBanner";
import SectionTitle from "../../../../components/utils/SectionTitle";
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
        href: "/superadmin/dashboard/record-sale/project",
    },
    {
        title: "Rental Sale",
        subTitle: "Rent PH",
        logo: RentphLogo,
        href: "/superadmin/dashboard/record-sale/rental",
    },
    {
        title: "Brokerage Sale",
        subTitle: "Leuterio Realty",
        logo: LrLogo,
        href: "/superadmin/dashboard/record-sale/brokerage",
    },
];

function SaleCard({ title, subTitle, logo, href }: SaleOption) {
    return (
        <Box
            sx={{
                border: "1px solid var(--lr-border)",
                borderRadius: 3,
                backgroundColor: "var(--lr-surface)",
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
                    alignItems: "center",
                    gap: 2,
                    p: 2.5,
                }}
            >
                <Box>
                    <Typography
                        variant="body2"
                        sx={{ fontWeight: 500, color: "var(--lr-text-primary)" }}
                    >
                        {title}
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{ color: "var(--lr-text-secondary)", fontSize: 13 }}
                    >
                        {subTitle}
                    </Typography>
                </Box>
                <Box
                    sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2.5,
                        // Brand logos are drawn for white, so the tile stays white in dark mode
                        backgroundColor: "#fff",
                        border: "1px solid var(--lr-border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                    }}
                >
                    <Box
                        component="img"
                        src={logo}
                        alt=""
                        sx={{ maxWidth: 34, maxHeight: 28 }}
                    />
                </Box>
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
                    borderTop: "1px solid var(--lr-border)",
                    textTransform: "none",
                    fontWeight: 500,
                    color: "var(--lr-primary)",
                    py: 1.25,
                    ":hover": { backgroundColor: "var(--lr-primary-soft)" },
                }}
            >
                Record Sale
            </StyledButton>
        </Box>
    );
}

function RecordSale() {
    return (
        <Container sx={{ py: { xs: 3, sm: 4 } }} maxWidth="lg">
            <FlashBanner />
            <SectionTitle
                title="Record your sale"
                subtitle="Choose the type of sale you closed."
            />
            <Grid container spacing={2}>
                {SALE_OPTIONS.map((opt) => (
                    <Grid key={opt.href} size={{ lg: 4, sm: 6, xs: 12 }}>
                        <SaleCard {...opt} />
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
}

RecordSale.layout = (page: ReactNode) => <DashboardLayout children={page} />;

export default RecordSale;
