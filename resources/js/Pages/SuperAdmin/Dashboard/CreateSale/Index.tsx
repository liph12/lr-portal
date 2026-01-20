import { ReactNode } from "react";
import DashboardLayout from "../../../../components/layouts/DashboardLayout";
import {
    Container,
    Box,
    Grid,
    Avatar,
    Typography,
    Button,
} from "@mui/material";
import FhDevelopersLogo from "../../../../../assets/fh-logo-dark.png";
import RentphLogo from "../../../../../assets/rentph-logo.png";
import LrLogo from "../../../../../assets/lr-logo.svg";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import DashboardCardOverview from "../../../../components/cards/DashboardCardOverview";
import StyledButton from "../../../../components/utils/StyledButton";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { Link } from "@inertiajs/react";

function CreateSale() {
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
                <Grid container spacing={2}>
                    <Grid size={{ lg: 4, md: 6, xs: 12 }}>
                        <Box
                            sx={{
                                border: "1px solid #ccc",
                                height: 120,
                                position: "relative",
                            }}
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    m: 2,
                                }}
                            >
                                <Box>
                                    <Typography variant="body2">
                                        Project Sale
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: "#777", fontSize: 13 }}
                                    >
                                        Developer
                                    </Typography>
                                </Box>
                                <Avatar
                                    src={FhDevelopersLogo}
                                    variant="square"
                                    sx={{ height: 30, width: "auto" }}
                                />
                            </Box>
                            <StyledButton
                                fullWidth
                                size="small"
                                variant="text"
                                color="inherit"
                                endIcon={<ArrowForwardRoundedIcon />}
                                LinkComponent={Link}
                                href="/superadmin/dashboard/create-sale/project"
                                sx={{
                                    position: "absolute",
                                    bottom: 0,
                                    borderRadius: 0,
                                    borderTop: "1px solid #ddd",
                                }}
                            >
                                Create Sale
                            </StyledButton>
                        </Box>
                    </Grid>
                    <Grid size={{ lg: 4, md: 6, xs: 12 }}>
                        <Box
                            sx={{
                                border: "1px solid #ccc",
                                height: 120,
                                position: "relative",
                            }}
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    m: 2,
                                }}
                            >
                                <Box>
                                    <Typography variant="body2">
                                        Rental Sale
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: "#777", fontSize: 13 }}
                                    >
                                        Rent PH
                                    </Typography>
                                </Box>
                                <Avatar
                                    src={RentphLogo}
                                    variant="square"
                                    sx={{ height: 30, width: "auto" }}
                                />
                            </Box>
                            <StyledButton
                                fullWidth
                                size="small"
                                variant="text"
                                color="inherit"
                                endIcon={<ArrowForwardRoundedIcon />}
                                LinkComponent={Link}
                                href="/superadmin/dashboard/create-sale/rental"
                                sx={{
                                    position: "absolute",
                                    bottom: 0,
                                    borderRadius: 0,
                                    borderTop: "1px solid #ddd",
                                }}
                            >
                                Create Sale
                            </StyledButton>
                        </Box>
                    </Grid>
                    <Grid size={{ lg: 4, md: 6, xs: 12 }}>
                        <Box
                            sx={{
                                border: "1px solid #ccc",
                                height: 120,
                                position: "relative",
                            }}
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    m: 2,
                                }}
                            >
                                <Box>
                                    <Typography variant="body2">
                                        Brokerage Sale
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: "#777", fontSize: 13 }}
                                    >
                                        Leuterio Realty
                                    </Typography>
                                </Box>
                                <Avatar
                                    src={LrLogo}
                                    variant="square"
                                    sx={{ height: 30, width: "auto" }}
                                />
                            </Box>
                            <StyledButton
                                fullWidth
                                size="small"
                                variant="text"
                                color="inherit"
                                endIcon={<ArrowForwardRoundedIcon />}
                                LinkComponent={Link}
                                href="/superadmin/dashboard/create-sale/brokerage"
                                sx={{
                                    position: "absolute",
                                    bottom: 0,
                                    borderRadius: 0,
                                    borderTop: "1px solid #ddd",
                                }}
                            >
                                Create Sale
                            </StyledButton>
                        </Box>
                    </Grid>
                </Grid>
            </Box>
        </Container>
    );
}

CreateSale.layout = (page: ReactNode) => <DashboardLayout children={page} />;

export default CreateSale;
