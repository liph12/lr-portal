import { ReactNode } from "react";
import {
    Box,
    Grid,
    Container,
    Typography,
    IconButton,
    Stack,
    Chip,
} from "@mui/material";
import DashboardLayout from "../../../components/layouts/DashboardLayout";
import DashboardCardApp from "../../../components/cards/DashboardCardApp";
import PropertyQrIcon from "../../../../assets/icons/property-qr-gray.png";
import DevelopersIcon from "../../../../assets/icons/developers-gray.png";
import FormDownloadIcon from "../../../../assets/icons/form-download.png";
import GenerateIdIcon from "../../../../assets/icons/generate-id-gray.png";
import PdfIcon from "../../../../assets/icons/pdf-gray.png";
import BuyerInformationIcon from "../../../../assets/icons/buyer-information-gray.png";
import { ShareRounded, ContentCopyRounded, Android } from "@mui/icons-material";
import { truncate } from "../../../helpers/truncateText";
import StyledButton from "../../../components/utils/StyledButton";
import NoteAddIcon from "@mui/icons-material/NoteAdd";
import { Link } from "@inertiajs/react";

// Reusable referral/link row card
function LinkCard({ label, url }: { label: string; url: string }) {
    return (
        <Box
            sx={{
                p: 2,
                border: "1px solid #e8eaed",
                borderRadius: 3,
                backgroundColor: "#fff",
                mb: 1.5,
                transition: "box-shadow 0.2s ease",
                ":hover": {
                    boxShadow: "0 1px 3px rgba(60,64,67,.15)",
                },
            }}
        >
            <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
            >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        variant="body2"
                        sx={{ fontWeight: 500, color: "#3c4043" }}
                    >
                        {label}
                    </Typography>
                    <Typography
                        variant="body2"
                        fontFamily="Google Sans Code"
                        fontWeight={300}
                        sx={{ color: "#5f6368" }}
                    >
                        {truncate(url, 35)}
                    </Typography>
                </Box>
                <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" sx={{ color: "#5f6368" }}>
                        <ContentCopyRounded fontSize="small" />
                    </IconButton>
                    <IconButton size="small" sx={{ color: "#5f6368" }}>
                        <ShareRounded fontSize="small" />
                    </IconButton>
                </Stack>
            </Stack>
        </Box>
    );
}

function Dashboard() {
    return (
        <Box
            sx={{
                height: "100%",
                minHeight: "100vh",
                overflowY: "auto",
                scrollBehavior: "smooth",
                backgroundColor: "#fff",
            }}
        >
            {/* Header band */}
            <Box
                sx={{
                    backgroundColor: "#f8f9fa",
                    borderBottom: "1px solid #e8eaed",
                    px: 4,
                    py: 4,
                }}
            >
                <Typography
                    sx={{
                        fontSize: 28,
                        fontWeight: 400,
                        color: "#202124",
                    }}
                >
                    Welcome to LR Portal, Philip 👋
                </Typography>
                <Typography variant="body2" sx={{ color: "#5f6368", mt: 0.5 }}>
                    Record your sale, manage and track statistics, access tools
                    and more.
                </Typography>
                <Box
                    sx={{
                        mt: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                    }}
                >
                    <StyledButton
                        variant="contained"
                        size="small"
                        sx={{
                            borderRadius: 99,
                            textTransform: "none",
                            backgroundColor: "#1a73e8",
                            px: 2.5,
                            ":hover": { backgroundColor: "#1765cc" },
                        }}
                        startIcon={<NoteAddIcon />}
                        LinkComponent={Link}
                        href="/superadmin/dashboard/create-sale"
                    >
                        Create Sale
                    </StyledButton>
                    <Chip
                        variant="outlined"
                        size="small"
                        icon={<Android />}
                        color="success"
                        label="Download the LR app now!"
                        onClick={() => {}}
                        sx={{ borderRadius: 99 }}
                    />
                </Box>
            </Box>

            <Container sx={{ py: 4 }} maxWidth="lg">
                {/* Your links */}
                <Typography
                    sx={{
                        fontSize: 18,
                        fontWeight: 500,
                        color: "#202124",
                        mb: 2,
                    }}
                >
                    Your links
                </Typography>
                <Grid container spacing={2} mb={4}>
                    <Grid size={{ lg: 6, md: 6, xs: 12 }}>
                        <LinkCard
                            label="Local Referral"
                            url="LR | registration/v2?ref=218171408"
                        />
                        <LinkCard
                            label="Global Referral"
                            url="LR | registration/v2?ref=218171408&type=international"
                        />
                    </Grid>
                    <Grid size={{ lg: 6, md: 6, xs: 12 }}>
                        <LinkCard
                            label="Business Profile"
                            url="LR | business-card?email=libresphilip14@gmail.com"
                        />
                        <LinkCard
                            label="Contact"
                            url="LR | contact/813223928/philip-libres"
                        />
                    </Grid>
                </Grid>

                {/* Tools & apps */}
                <Typography
                    sx={{
                        fontSize: 18,
                        fontWeight: 500,
                        color: "#202124",
                        mb: 2,
                    }}
                >
                    Tools &amp; apps
                </Typography>
                <Grid container spacing={2}>
                    <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                        <DashboardCardApp
                            icon={PropertyQrIcon}
                            title="Property QR Code Poster"
                            subTitle="Filipinohomes"
                            description="Provides instant access to comprehensive property details through a simple scan."
                        />
                    </Grid>
                    <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                        <DashboardCardApp
                            icon={PropertyQrIcon}
                            title="QR Code Maker"
                            subTitle="Leuterio Realty"
                            description="Customize a QR code for your URL/Links using LR domain."
                        />
                    </Grid>
                    <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                        <DashboardCardApp
                            icon={DevelopersIcon}
                            title="Filipinohomes Developers PH"
                            subTitle="Developers"
                            description="Search projects per developer nationwide."
                        />
                    </Grid>
                    <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                        <DashboardCardApp
                            icon={GenerateIdIcon}
                            title="Generate LR ID"
                            subTitle="Leuterio Realty"
                            description="Generate, print and preview the front and back portions of your LR ID."
                        />
                    </Grid>
                    <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                        <DashboardCardApp
                            icon={PdfIcon}
                            title="Policy Handbook PDF"
                            subTitle="Leuterio Realty"
                            description="Download or view a digital copy of Salesperson Policy Handbook."
                        />
                    </Grid>
                    <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                        <DashboardCardApp
                            icon={FormDownloadIcon}
                            title="LR Portal Forms"
                            subTitle="Leuterio Realty"
                            description="Download forms here such as activation, reactivation, data correction form and more."
                        />
                    </Grid>
                    <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                        <DashboardCardApp
                            icon={FormDownloadIcon}
                            title="FH Global Realty Forms"
                            subTitle="Global Realty"
                            description="Download and fill-up forms here such as customer information and agent to agent form."
                        />
                    </Grid>
                    <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                        <DashboardCardApp
                            icon={BuyerInformationIcon}
                            title="Buyer's Information Sheet"
                            subTitle="Cebu Landmasters Inc."
                            description="Download and fill-up individual BIS form here."
                        />
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
}

Dashboard.layout = (page: ReactNode) => <DashboardLayout children={page} />;

export default Dashboard;
