import { ReactNode } from "react";
import DashboardLayout from "../../../../components/layouts/DashboardLayout";
import { Container, Box, Grid, Typography } from "@mui/material";
import SectionTitle from "../../../../components/utils/SectionTitle";
import SalesEncodingNotice from "../../../../components/utils/SalesEncodingNotice";
import { SalesEncodingState } from "../../../../types/app-data-types";
import FhDevelopersLogo from "../../../../../assets/fh-logo-dark.png";
import RentphLogo from "../../../../../assets/rentph-logo.png";
import LrLogo from "../../../../../assets/lr-logo.svg";
import { ChevronRightRounded } from "@mui/icons-material";
import { Link } from "@inertiajs/react";

interface SaleOption {
    title: string;
    subTitle: string;
    description: string;
    logo: string;
    href: string;
    // Which recording permission the card needs.
    kind: "local" | "international";
}

const SALE_OPTIONS: SaleOption[] = [
    {
        title: "Project Sale",
        subTitle: "Developer",
        description: "A unit or lot sold in a developer's project.",
        logo: FhDevelopersLogo,
        href: "/dashboard/record-sale/project",
        kind: "local",
    },
    {
        title: "Rental Sale",
        subTitle: "Rent PH",
        description: "A lease you closed, with its deposit and remittance slips.",
        logo: RentphLogo,
        href: "/dashboard/record-sale/rental",
        kind: "local",
    },
    {
        title: "Brokerage Sale",
        subTitle: "Leuterio Realty",
        description: "A resale or brokerage deal in one of our brokerage areas.",
        logo: LrLogo,
        href: "/dashboard/record-sale/brokerage",
        kind: "local",
    },
    {
        title: "International Sale",
        subTitle: "Global Partner",
        description: "A sale you closed as a global partner, from abroad.",
        logo: LrLogo,
        href: "/dashboard/record-sale/international",
        kind: "international",
    },
];

// Same card as the Reports page: the whole card opens the form; the logo sits in a white tile on the left.
function SaleCard({ title, subTitle, description, logo, href }: SaleOption) {
    return (
        <Link href={href} style={{ textDecoration: "none" }}>
            <Box
                sx={{
                    height: "100%",
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
                        width: 72,
                        height: 72,
                        borderRadius: 3,
                        backgroundColor: "var(--lr-logo-tile)",
                        border: "1px solid var(--lr-border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        p: 1,
                    }}
                >
                    <Box component="img" src={logo} alt="" sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body1" sx={{ fontWeight: 500, color: "var(--lr-text-primary)" }}>
                        {title}
                    </Typography>
                    <Typography variant="caption" component="div" sx={{ color: "var(--lr-primary)", fontWeight: 500 }}>
                        {subTitle}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", mt: 0.5 }}>
                        {description}
                    </Typography>
                </Box>
                <ChevronRightRounded sx={{ color: "var(--lr-text-secondary)" }} />
            </Box>
        </Link>
    );
}

interface RecordSaleProps {
    encoding: SalesEncodingState;
    can: { local: boolean; international: boolean };
}

function RecordSale({ encoding, can }: RecordSaleProps) {
    return (
        <Container sx={{ py: { xs: 3, sm: 4 } }} maxWidth="lg">
            <SalesEncodingNotice encoding={encoding} />
            <SectionTitle
                title="Record your sale"
                subtitle="Choose the type of sale you closed."
            />
            <Grid container spacing={2}>
                {SALE_OPTIONS.filter((opt) => can[opt.kind]).map((opt) => (
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
