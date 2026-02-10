import {
    Box,
    Divider,
    Typography,
    Avatar,
    Badge,
    IconButton,
    Stack,
} from "@mui/material";
import { SearchRounded } from "@mui/icons-material";
import { Link } from "@inertiajs/react";
import useSidebarRoutes from "../hooks/useSidebarRoutes";
import UserOnlineAvatar from "./utils/user/UserOnlineAvatar";
import { User } from "./utils/user/UserOnlineAvatar";
import { router } from "@inertiajs/react";
import StyledButton from "./utils/StyledButton";

const users: User[] = [
    {
        id: 0,
        avatar: "https://leuteriorealty.com/memberfiles/0/20240419043008.jpg",
        name: "Anthony Gerard Leuterio",
        online: true,
        role: "Superadmin",
        timestamp: "0m",
    },
    {
        id: 1,
        avatar: "https://leuteriorealty.com/memberfiles/820243635/20250317015638.jpg",
        name: "John Nel Lim",
        online: false,
        role: "Staff",
        timestamp: "45m",
    },
];

export default function AppSidebar() {
    const routes = useSidebarRoutes();

    const handleLogout = () => router.post("/logout");

    return (
        <Box
            sx={{
                width: 250,
                height: "100vh",
                backgroundColor: "#222",
                borderLeft: "0.5px solid #333",
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* Menu */}
            <Box sx={{ my: 2 }}>
                {routes.map((r, k) => {
                    const ADMINISTRATOR_GROUP = k === 0;
                    const STAFF_GROUP = k === 2;

                    return (
                        <Box key={k}>
                            {ADMINISTRATOR_GROUP && (
                                <Typography
                                    sx={{ color: "#999", px: 2, mb: 1 }}
                                    variant="caption"
                                >
                                    Administrator
                                </Typography>
                            )}
                            {STAFF_GROUP && (
                                <Typography
                                    sx={{ color: "#999", px: 2, my: 1 }}
                                    variant="caption"
                                >
                                    Staff
                                </Typography>
                            )}

                            <Link
                                href={r.path}
                                style={{ textDecoration: "none" }}
                            >
                                <Typography
                                    sx={{
                                        px: 2,
                                        py: 1,
                                        cursor: "pointer",
                                        color: "#ddd",
                                        backgroundColor: r.active
                                            ? "#555"
                                            : "none",
                                        borderLeft: r.active
                                            ? "5px solid #ddd"
                                            : "5px solid transparent",
                                        transition: "0.2s",
                                        ":hover": {
                                            backgroundColor: "#333",
                                            color: "#fff",
                                        },
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 2,
                                    }}
                                    component="div"
                                    variant="body2"
                                >
                                    <r.icon fontSize="small" /> {r.name}
                                </Typography>
                            </Link>
                        </Box>
                    );
                })}
            </Box>

            {/* Logout */}
            <Box sx={{ px: 2 }}>
                <StyledButton
                    onClick={handleLogout}
                    variant="contained"
                    size="small"
                    fullWidth
                    color="error"
                >
                    Logout
                </StyledButton>
            </Box>

            {/* Bottom section */}
            <Box sx={{ mt: 5 }}>
                <Divider sx={{ my: 1, backgroundColor: "#777" }} />

                <Typography
                    sx={{ color: "#999", px: 2, mb: 1 }}
                    variant="caption"
                >
                    Online users (2)
                </Typography>

                <Box sx={{ maxHeight: "45vh", overflowY: "auto" }}>
                    {users.map((u) => (
                        <UserOnlineAvatar
                            key={u.id}
                            avatar={u.avatar}
                            name={u.name}
                            online={u.online}
                            role={u.role}
                            timestamp={u.timestamp}
                        />
                    ))}
                </Box>
            </Box>
        </Box>
    );
}
