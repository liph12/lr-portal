import { ReactNode } from "react";
import {
    Box,
    Grid,
    Divider,
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
import LrPortalBg from "../../../../assets/lr-portal-bg-mainv3.png";
import { ShareRounded, ContentCopyRounded, Android } from "@mui/icons-material";
import { truncate } from "../../../helpers/truncateText";

function Dashboard() {
    return (
        <Box
            sx={{
                height: "100vh",
                overflowY: "auto",
                scrollBehavior: "smooth",
            }}
        >
            <Box
                sx={{
                    backgroundImage: `url(${LrPortalBg})`,
                    backgroundSize: "cover",
                    backgroundRepeat: "no-repeat",
                    height: 200,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <Box>
                    <Typography
                        variant="body1"
                        sx={{ fontSize: 25, fontWeight: 300 }}
                    >
                        Welcome to LR Portal Philip!
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#777" }}>
                        Record your sale, manage and track statistics, access
                        tools and more.
                    </Typography>
                    <Chip
                        sx={{ mt: 1 }}
                        variant="outlined"
                        size="small"
                        icon={<Android />}
                        color="success"
                        label="Download the LR app now!"
                        onClick={() => {}}
                    />
                </Box>
            </Box>
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
                    <Grid container spacing={2} mb={2}>
                        <Grid size={{ lg: 6, md: 6, xs: 12 }}>
                            <Box
                                sx={{
                                    p: 2,
                                    border: "1px solid #ddd",
                                    borderRadius: 0.5,
                                    overflowY: "auto",
                                    mb: 1,
                                }}
                            >
                                <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                >
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="body2">
                                            Local Referral
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            fontFamily="Google Sans Code"
                                            fontWeight={300}
                                            sx={{ color: "#777" }}
                                        >
                                            {truncate(
                                                "LR | registration/v2?ref=218171408",
                                                35
                                            )}
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={1}>
                                        <IconButton size="small">
                                            <ContentCopyRounded fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small">
                                            <ShareRounded fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                </Stack>
                            </Box>
                            <Box
                                sx={{
                                    p: 2,
                                    border: "1px solid #ddd",
                                    borderRadius: 0.5,
                                    overflowY: "auto",
                                    mb: 1,
                                }}
                            >
                                <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                >
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="body2">
                                            Global Referral
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            fontFamily="Google Sans Code"
                                            fontWeight={300}
                                            sx={{ color: "#777" }}
                                        >
                                            {truncate(
                                                "LR | registration/v2?ref=218171408&type=international",
                                                35
                                            )}
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={1}>
                                        <IconButton size="small">
                                            <ContentCopyRounded fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small">
                                            <ShareRounded fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                </Stack>
                            </Box>
                        </Grid>
                        <Grid size={{ lg: 6, md: 6, xs: 12 }}>
                            <Box
                                sx={{
                                    p: 2,
                                    border: "1px solid #ddd",
                                    borderRadius: 0.5,
                                    overflowY: "auto",
                                    mb: 1,
                                }}
                            >
                                <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                >
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="body2">
                                            Business Profile
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            fontFamily="Google Sans Code"
                                            fontWeight={300}
                                            sx={{ color: "#777" }}
                                        >
                                            {truncate(
                                                "LR | business-card?email=libresphilip14@gmail.com",
                                                35
                                            )}
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={1}>
                                        <IconButton size="small">
                                            <ContentCopyRounded fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small">
                                            <ShareRounded fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                </Stack>
                            </Box>
                            <Box
                                sx={{
                                    p: 2,
                                    border: "1px solid #ddd",
                                    borderRadius: 0.5,
                                    overflowY: "auto",
                                    mb: 1,
                                }}
                            >
                                <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                >
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="body2">
                                            Contact
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            fontFamily="Google Sans Code"
                                            fontWeight={300}
                                            sx={{ color: "#777" }}
                                        >
                                            {truncate(
                                                "LR | contact/813223928/philip-libres",
                                                35
                                            )}
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={1}>
                                        <IconButton size="small">
                                            <ContentCopyRounded fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small">
                                            <ShareRounded fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                </Stack>
                            </Box>
                        </Grid>{" "}
                    </Grid>
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
                </Box>
            </Container>
        </Box>
    );
}

Dashboard.layout = (page: ReactNode) => <DashboardLayout children={page} />;

export default Dashboard;
