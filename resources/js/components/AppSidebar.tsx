import { Box, Divider, Typography } from "@mui/material";
import { Link } from "@inertiajs/react";
import useSidebarRoutes from "../hooks/useSidebarRoutes";
import UserOnlineAvatar from "./utils/user/UserOnlineAvatar";
import { User } from "./utils/user/UserOnlineAvatar";

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
        avatar: "https://filipinohomes123.s3.ap-southeast-1.amazonaws.com/filipinohomes-compressed-from-old/cd23c6fa-51a9-40b9-926b-422a97739987.webp",
        name: "Philip Libres",
        online: false,
        role: "Staff",
        timestamp: "45m",
    },
];

export default function AppSidebar() {
    const routes = useSidebarRoutes();

    return (
        <Box
            sx={{
                width: 270,
                height: "100vh",
                backgroundColor: "#f8f9fa",
                borderRight: "1px solid #e8eaed",
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
            }}
        >
            {/* Menu */}
            <Box sx={{ py: 2, pr: 1.5 }}>
                {routes.map((r, k) => {
                    const ADMINISTRATOR_GROUP = k === 0;
                    const STAFF_GROUP = k === 3;

                    return (
                        <Box key={k}>
                            {ADMINISTRATOR_GROUP && (
                                <Typography
                                    sx={{
                                        color: "#5f6368",
                                        px: 3,
                                        mt: 1,
                                        mb: 1,
                                        fontWeight: 500,
                                        letterSpacing: 0.3,
                                        display: "block",
                                    }}
                                    variant="caption"
                                >
                                    Administrator
                                </Typography>
                            )}
                            {STAFF_GROUP && (
                                <Typography
                                    sx={{
                                        color: "#5f6368",
                                        px: 3,
                                        mt: 2,
                                        mb: 1,
                                        fontWeight: 500,
                                        letterSpacing: 0.3,
                                        display: "block",
                                    }}
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
                                        pl: 3,
                                        pr: 2,
                                        py: 1.5,
                                        mb: 0.5,
                                        cursor: "pointer",
                                        // flush-left, rounded right cap
                                        borderTopRightRadius: 99,
                                        borderBottomRightRadius: 99,
                                        color: r.active ? "#1a73e8" : "#3c4043",
                                        backgroundColor: r.active
                                            ? "#d2e3fc"
                                            : "transparent",
                                        fontWeight: 500,
                                        transition: "0.15s",
                                        ":hover": {
                                            backgroundColor: r.active
                                                ? "#d2e3fc"
                                                : "#eceff1",
                                        },
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 2,
                                        "& svg": {
                                            color: r.active
                                                ? "#1a73e8"
                                                : "#5f6368",
                                        },
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

            {/* Online users — flows right after the routes */}
            <Box sx={{ pr: 1.5, pb: 2 }}>
                <Divider sx={{ my: 1, borderColor: "#e8eaed", ml: 3 }} />

                <Typography
                    sx={{
                        color: "#5f6368",
                        px: 3,
                        mb: 1,
                        fontWeight: 500,
                        display: "block",
                    }}
                    variant="caption"
                >
                    Online users (2)
                </Typography>

                <Box>
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
