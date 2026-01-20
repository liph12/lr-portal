import { Box, Typography, Avatar } from "@mui/material";

interface DashboardCardApp {
    title: string;
    subTitle: string;
    description: string;
    icon: string;
}

export default function DashboardCardApp({
    title,
    subTitle,
    description,
    icon,
}: DashboardCardApp) {
    return (
        <Box
            sx={{
                p: 2,
                border: "1px solid #ddd",
                height: 150,
                borderRadius: 0.5,
            }}
        >
            <Avatar
                src={icon}
                sx={{ width: 35, height: "auto" }}
                variant="square"
            />
            <Box sx={{ mt: 1, mb: 2 }}>
                <Typography variant="body2">{title}</Typography>
                <Typography
                    variant="body2"
                    sx={{ color: "#777", fontSize: 13 }}
                >
                    {subTitle}
                </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: "#777" }}>
                {description}
            </Typography>
        </Box>
    );
}
