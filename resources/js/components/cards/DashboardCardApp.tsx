import { Box, Typography, Avatar } from "@mui/material";

interface DashboardCardAppProps {
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
}: DashboardCardAppProps) {
    return (
        <Box
            sx={{
                p: 2,
                border: "1px solid #e0e0e0",
                borderRadius: 2,
                height: "100%",
                minHeight: 180,
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#fff",
                transition: "box-shadow 0.2s ease, border-color 0.2s ease",
                cursor: "pointer",
                "&:hover": {
                    boxShadow:
                        "0 1px 3px rgba(60,64,67,.3), 0 4px 8px rgba(60,64,67,.15)",
                    borderColor: "transparent",
                },
            }}
        >
            <Avatar
                src={icon}
                sx={{ width: 35, height: "auto" }}
                variant="square"
            />
            <Box sx={{ mt: 1.5, mb: 1 }}>
                <Typography variant="body2" fontWeight={500}>
                    {title}
                </Typography>
                <Typography
                    variant="body2"
                    sx={{ color: "#5f6368", fontSize: 13 }}
                >
                    {subTitle}
                </Typography>
            </Box>
            <Typography
                variant="caption"
                sx={{ color: "#5f6368", lineHeight: 1.5 }}
            >
                {description}
            </Typography>
        </Box>
    );
}
