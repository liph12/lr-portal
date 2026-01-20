import { Avatar, Box, Typography, Badge } from "@mui/material";

type Role =
    | "Superadmin"
    | "Admin"
    | "Staff"
    | "Unit Manager"
    | "Team Leader"
    | "Agent"
    | "Secretary";

export interface User {
    id?: number;
    avatar: string;
    name: string;
    role: Role;
    online: boolean;
    timestamp?: string;
}

export default function UserOnlineAvatar({
    avatar,
    name,
    role,
    online,
    timestamp,
}: User) {
    return (
        <>
            <Box
                sx={{
                    display: "flex",
                    gap: 1,
                    my: 0.5,
                    alignItems: "center",
                    px: 2,
                }}
            >
                <Badge
                    overlap="circular"
                    anchorOrigin={{
                        vertical: "bottom",
                        horizontal: "right",
                    }}
                    badgeContent={
                        <>
                            {online ? (
                                <Box
                                    sx={{
                                        height: 8,
                                        width: 8,
                                        backgroundColor: "rgb(78, 210, 94)",
                                        borderRadius: "50%",
                                        border: "1px solid #222",
                                    }}
                                />
                            ) : (
                                <Box
                                    sx={{
                                        px: 0.3,
                                        backgroundColor: "#222",
                                        borderRadius: 1,
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            color: "rgb(78, 210, 94)",
                                            fontSize: 8,
                                        }}
                                    >
                                        {timestamp}
                                    </Typography>
                                </Box>
                            )}
                        </>
                    }
                >
                    <Avatar
                        src={avatar}
                        alt="Anthony Gerard Leuterio"
                        sx={{
                            backgroundColor: "#aaa",
                            height: 30,
                            width: 30,
                            fontSize: 12,
                        }}
                    />
                </Badge>
                <Box>
                    <Typography
                        variant="body2"
                        fontSize={12}
                        sx={{ color: "#ddd" }}
                    >
                        {name}
                    </Typography>
                    <Typography
                        variant="caption"
                        fontFamily="Google Sans Code"
                        sx={{ color: "#aaa", fontSize: 10 }}
                    >
                        {role}
                    </Typography>
                </Box>
            </Box>
        </>
    );
}
