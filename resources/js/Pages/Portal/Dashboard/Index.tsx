import { ReactNode } from "react";
import {
    Box,
    Grid,
    Container,
    Typography,
    IconButton,
    Stack,
    Tooltip,
} from "@mui/material";
import DashboardLayout from "../../../components/layouts/DashboardLayout";
import DashboardCardApp from "../../../components/cards/DashboardCardApp";
import PropertyQrIcon from "../../../../assets/icons/property-qr-gray.png";
import DevelopersIcon from "../../../../assets/icons/developers-gray.png";
import FormDownloadIcon from "../../../../assets/icons/form-download.png";
import GenerateIdIcon from "../../../../assets/icons/generate-id-gray.png";
import PdfIcon from "../../../../assets/icons/pdf-gray.png";
import BuyerInformationIcon from "../../../../assets/icons/buyer-information-gray.png";
import {
    ShareRounded,
    ContentCopyRounded,
    Android,
    LinkRounded,
} from "@mui/icons-material";
import { hasAnyPermission, RECORD_PERMISSIONS } from "../../../helpers/permissions";
import SectionTitle from "../../../components/utils/SectionTitle";
import useAuthUser from "../../../hooks/useAuthUser";
import { buildUserLinks } from "../../../helpers/userLinks";
import StyledButton from "../../../components/utils/StyledButton";
import NoteAddIcon from "@mui/icons-material/NoteAdd";
import { Link } from "@inertiajs/react";

function LinkCard({ label, url }: { label: string; url: string }) {
    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1.5,
                pl: 2,
                border: "1px solid var(--lr-border)",
                borderRadius: 3,
                backgroundColor: "var(--lr-surface)",
                mb: 1.5,
                transition: "box-shadow 0.2s ease",
                ":hover": {
                    boxShadow: "0 1px 3px rgba(60,64,67,.15)",
                },
            }}
        >
            <Box
                sx={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    backgroundColor: "var(--lr-primary-soft)",
                    color: "var(--lr-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                }}
            >
                <LinkRounded fontSize="small" />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    variant="body2"
                    sx={{ fontWeight: 500, color: "var(--lr-text-primary)" }}
                >
                    {label}
                </Typography>
                <Typography
                    variant="caption"
                    component="div"
                    fontFamily="Google Sans Code"
                    sx={{
                        color: "var(--lr-text-secondary)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                    title={url}
                >
                    {url}
                </Typography>
            </Box>
            <Stack direction="row" spacing={0.5}>
                <Tooltip title="Copy">
                    <IconButton
                        size="small"
                        sx={{ color: "var(--lr-text-secondary)" }}
                    >
                        <ContentCopyRounded fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Share">
                    <IconButton
                        size="small"
                        sx={{ color: "var(--lr-text-secondary)" }}
                    >
                        <ShareRounded fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Stack>
        </Box>
    );
}

const SAMPLE_PROFILE_PICTURE =
    "https://filipinohomes123.s3.ap-southeast-1.amazonaws.com/filipinohomes-compressed-from-old/cd23c6fa-51a9-40b9-926b-422a97739987.webp";

function Dashboard() {
    const user = useAuthUser();
    const links = user ? buildUserLinks(user) : [];

    return (
        <Box sx={{ backgroundColor: "var(--lr-surface)" }}>
            {/* Header band */}
            <Box
                sx={{
                    backgroundColor: "var(--lr-surface-dim)",
                    borderBottom: "1px solid var(--lr-border)",
                    px: { xs: 2, sm: 4 },
                    py: { xs: 3, sm: 4 },
                }}
            >
                <Typography
                    sx={{
                        fontSize: { xs: 22, sm: 28 },
                        fontWeight: 400,
                        color: "var(--lr-text-primary)",
                    }}
                >
                    Welcome{user?.first_name ? `, ${user.first_name}` : ""} 👋
                </Typography>
                <Typography
                    variant="body2"
                    sx={{ color: "var(--lr-text-secondary)", mt: 0.5 }}
                >
                    Record your sale, manage and track statistics, access tools
                    and more.
                </Typography>
                <Box
                    sx={{
                        mt: 2,
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: { xs: 1, sm: 2 },
                    }}
                >
                    {hasAnyPermission(user?.permissions, RECORD_PERMISSIONS) && (
                        <StyledButton
                            variant="contained"
                            size="small"
                            sx={{
                                borderRadius: 99,
                                textTransform: "none",
                                backgroundColor: "var(--lr-primary)",
                                px: 2.5,
                                ":hover": {
                                    backgroundColor: "var(--lr-primary-hover)",
                                },
                            }}
                            startIcon={<NoteAddIcon />}
                            LinkComponent={Link}
                            href="/dashboard/record-sale"
                        >
                            Record Your Sale
                        </StyledButton>
                    )}
                    <StyledButton
                        variant="outlined"
                        size="small"
                        startIcon={<Android />}
                        sx={{
                            px: 2,
                            color: "var(--lr-text-body)",
                            borderColor: "var(--lr-outline)",
                            backgroundColor: "var(--lr-surface)",
                            "& .MuiButton-startIcon": {
                                color: "var(--lr-success-icon)",
                            },
                            ":hover": {
                                borderColor: "var(--lr-outline)",
                                backgroundColor: "var(--lr-surface-dim)",
                            },
                        }}
                    >
                        Download the LR app
                    </StyledButton>
                </Box>
            </Box>

            <Container sx={{ py: { xs: 3, sm: 4 } }} maxWidth="lg">
                {/* Your links */}
                <SectionTitle
                    title="Your links"
                    subtitle="Share these with clients and recruits."
                />
                <Grid container columnSpacing={2} mb={3}>
                    {links.map((link) => (
                        <Grid key={link.label} size={{ md: 6, xs: 12 }}>
                            <LinkCard label={link.label} url={link.url} />
                        </Grid>
                    ))}
                </Grid>

                {/* Tools & apps */}
                <SectionTitle
                    title="Tools & apps"
                    subtitle="Forms, IDs and utilities for your day-to-day work."
                />
                <Grid container spacing={2}>
                    <Grid size={{ lg: 3, sm: 6, xs: 12 }}>
                        <DashboardCardApp
                            icon={PropertyQrIcon}
                            title="Property QR Code Poster"
                            subTitle="Filipinohomes"
                            description="Provides instant access to comprehensive property details through a simple scan."
                        />
                    </Grid>
                    <Grid size={{ lg: 3, sm: 6, xs: 12 }}>
                        <DashboardCardApp
                            icon={PropertyQrIcon}
                            title="QR Code Maker"
                            subTitle="Leuterio Realty"
                            description="Customize a QR code for your URL/Links using LR domain."
                        />
                    </Grid>
                    <Grid size={{ lg: 3, sm: 6, xs: 12 }}>
                        <DashboardCardApp
                            icon={DevelopersIcon}
                            title="Filipinohomes Developers PH"
                            subTitle="Developers"
                            description="Search projects per developer nationwide."
                        />
                    </Grid>
                    <Grid size={{ lg: 3, sm: 6, xs: 12 }}>
                        <DashboardCardApp
                            icon={GenerateIdIcon}
                            title="Generate LR ID"
                            subTitle="Leuterio Realty"
                            description="Generate, print and preview the front and back portions of your LR ID."
                        />
                    </Grid>
                    <Grid size={{ lg: 3, sm: 6, xs: 12 }}>
                        <DashboardCardApp
                            icon={PdfIcon}
                            title="Policy Handbook PDF"
                            subTitle="Leuterio Realty"
                            description="Download or view a digital copy of Salesperson Policy Handbook."
                        />
                    </Grid>
                    <Grid size={{ lg: 3, sm: 6, xs: 12 }}>
                        <DashboardCardApp
                            icon={FormDownloadIcon}
                            title="LR Portal Forms"
                            subTitle="Leuterio Realty"
                            description="Download forms here such as activation, reactivation, data correction form and more."
                        />
                    </Grid>
                    <Grid size={{ lg: 3, sm: 6, xs: 12 }}>
                        <DashboardCardApp
                            icon={FormDownloadIcon}
                            title="FH Global Realty Forms"
                            subTitle="Global Realty"
                            description="Download and fill-up forms here such as customer information and agent to agent form."
                        />
                    </Grid>
                    <Grid size={{ lg: 3, sm: 6, xs: 12 }}>
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
