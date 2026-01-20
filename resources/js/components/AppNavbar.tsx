import {
    Box,
    Divider,
    Avatar,
    IconButton,
    InputBase,
    Typography,
} from "@mui/material";
import AppBreadcrumbs from "./utils/AppBreadcrumbs";
import APP_LOGO from "../../assets/lr-logo.svg";
import {
    MenuRounded,
    SearchRounded,
    MoreVertRounded,
    NotificationsOutlined,
} from "@mui/icons-material";
import StyledButton from "./utils/StyledButton";

export default function AppNavbar() {
    return (
        <>
            <Box
                sx={{
                    py: 0.5,
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        gap: 2,
                        alignItems: "center",
                        px: 2,
                    }}
                >
                    <IconButton>
                        <MenuRounded />
                    </IconButton>
                    <Avatar
                        src={APP_LOGO}
                        variant="square"
                        sx={{ height: "auto", width: 70 }}
                    />
                </Box>
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        width: "100%",
                    }}
                >
                    <Box
                        sx={{
                            width: 500,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                        }}
                    >
                        <InputBase
                            fullWidth
                            size="small"
                            placeholder="Search (/) for resources, sales, agents, developers & more"
                            sx={{
                                // borderBottom: "1px solid #aaa",
                                // py: 0.5,
                                fontSize: 16,
                                fontWeight: 300,
                                "& .MuiInputBase-input::placeholder": {
                                    color: "#999",
                                    opacity: 1,
                                },
                            }}
                        />
                        <StyledButton
                            size="medium"
                            variant="text"
                            color="inherit"
                            startIcon={<SearchRounded color="error" />}
                        >
                            Search
                        </StyledButton>
                        {/* <Typography variant="body2" sx={{ color: "#777" }}>
                            Search
                        </Typography> */}
                    </Box>
                </Box>
                <Box>
                    <IconButton>
                        <NotificationsOutlined />
                    </IconButton>
                </Box>
                <Box>
                    <IconButton>
                        <MoreVertRounded />
                    </IconButton>
                </Box>
                <Box sx={{ pr: 1 }}>
                    <Avatar
                        src={null}
                        alt="Philip Libres"
                        sx={{ height: 38, width: 38 }}
                    />
                </Box>
            </Box>
            <Divider />
            <Box
                sx={{
                    height: "auto",
                    px: 3,
                    py: 0.5,
                }}
            >
                <AppBreadcrumbs />
            </Box>
            <Divider />
        </>
    );
}
