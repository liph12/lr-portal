import { Box, Divider, Avatar, IconButton, InputBase } from "@mui/material";
import AppBreadcrumbs from "./utils/AppBreadcrumbs";
import APP_LOGO from "../../assets/lr-logo.svg";
import {
    MenuRounded,
    SearchRounded,
    MoreVertRounded,
    NotificationsOutlined,
} from "@mui/icons-material";

export default function AppNavbar() {
    return (
        <>
            <Box
                sx={{
                    py: 1,
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    backgroundColor: "#fff",
                }}
            >
                {/* Left: menu + logo */}
                <Box
                    sx={{
                        display: "flex",
                        gap: 1.5,
                        alignItems: "center",
                        px: 2,
                        flexShrink: 0,
                    }}
                >
                    <IconButton sx={{ color: "#5f6368" }}>
                        <MenuRounded />
                    </IconButton>
                    <Avatar
                        src={APP_LOGO}
                        variant="square"
                        sx={{ height: "auto", width: 70 }}
                    />
                </Box>

                {/* Center: search */}
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        flex: 1,
                        px: 2,
                    }}
                >
                    <Box
                        sx={{
                            width: "100%",
                            maxWidth: 720,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            px: 2,
                            py: 0.75,
                            borderRadius: 99,
                            backgroundColor: "#f1f3f4",
                            transition:
                                "background-color 0.15s, box-shadow 0.15s",
                            ":focus-within": {
                                backgroundColor: "#fff",
                                boxShadow: "0 1px 3px rgba(60,64,67,.2)",
                            },
                        }}
                    >
                        <SearchRounded
                            sx={{ color: "#5f6368" }}
                            fontSize="small"
                        />
                        <InputBase
                            fullWidth
                            size="small"
                            placeholder="Search (/) for resources, sales, agents, developers & more"
                            sx={{
                                fontSize: 15,
                                fontWeight: 400,
                                color: "#3c4043",
                                "& .MuiInputBase-input::placeholder": {
                                    color: "#5f6368",
                                    opacity: 1,
                                },
                            }}
                        />
                    </Box>
                </Box>

                {/* Right: actions + avatar */}
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        px: 1.5,
                        flexShrink: 0,
                    }}
                >
                    <IconButton sx={{ color: "#5f6368" }}>
                        <NotificationsOutlined />
                    </IconButton>
                    <IconButton sx={{ color: "#5f6368" }}>
                        <MoreVertRounded />
                    </IconButton>
                    <Avatar
                        src={undefined}
                        alt="Philip Libres"
                        sx={{ height: 36, width: 36, ml: 0.5 }}
                    />
                </Box>
            </Box>
            <Divider sx={{ borderColor: "#e8eaed" }} />
            <Box
                sx={{
                    px: 3,
                    py: 0.75,
                    backgroundColor: "#fff",
                }}
            >
                <AppBreadcrumbs />
            </Box>
            <Divider sx={{ borderColor: "#e8eaed" }} />
        </>
    );
}
