import { Box, Typography, Avatar } from "@mui/material";
import { ArrowDownward, ArrowUpward } from "@mui/icons-material";

interface DashboardCardOverviewProps {
    title: string;
    value: string | number;
    rateType?: "success" | "error" | "warning";
    rateValue?: string;
    rateLabel: string;
    iconSrc: string;
    iconSize?: number;
    footerLabel: string;
}

export default function DashboardCardOverview({
    title,
    value,
    rateType,
    rateValue,
    rateLabel,
    iconSrc,
    iconSize = 45,
    footerLabel,
}: DashboardCardOverviewProps) {
    const rateColor =
        rateType === "error"
            ? "#d93025"
            : rateType === "warning"
              ? "#f29900"
              : "#1e8e3e";

    return (
        <Box
            sx={{
                p: 2.5,
                borderRadius: 3,
                border: "1px solid #e8eaed",
                backgroundColor: "#fff",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                transition: "box-shadow 0.2s ease",
                ":hover": {
                    boxShadow:
                        "0 1px 3px rgba(60,64,67,.15), 0 4px 8px rgba(60,64,67,.1)",
                },
            }}
        >
            {/* Title row */}
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                }}
            >
                <Typography
                    variant="body2"
                    sx={{ color: "#5f6368", fontWeight: 500 }}
                >
                    {title}
                </Typography>
                <Avatar
                    src={iconSrc}
                    sx={{ width: iconSize, height: "auto" }}
                    variant="square"
                />
            </Box>

            {/* Metric */}
            <Typography
                fontFamily="Google Sans Code"
                sx={{
                    fontSize: 32,
                    fontWeight: 400,
                    color: "#202124",
                    mt: 1,
                    lineHeight: 1.2,
                }}
            >
                {value}
            </Typography>

            {/* Rate + footer */}
            <Box sx={{ mt: "auto", pt: 2 }}>
                {rateType ? (
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.3,
                        }}
                    >
                        {rateType === "error" ? (
                            <ArrowDownward
                                sx={{ fontSize: 15, color: rateColor }}
                            />
                        ) : (
                            <ArrowUpward
                                sx={{ fontSize: 15, color: rateColor }}
                            />
                        )}
                        <Typography
                            variant="body2"
                            component="span"
                            sx={{ color: rateColor, fontWeight: 500 }}
                        >
                            {rateValue}
                        </Typography>
                        <Typography
                            component="span"
                            variant="body2"
                            sx={{ color: "#5f6368", ml: 0.5 }}
                        >
                            {rateLabel}
                        </Typography>
                    </Box>
                ) : (
                    <Typography variant="body2" sx={{ color: "#5f6368" }}>
                        {rateLabel}
                    </Typography>
                )}
                <Typography
                    variant="caption"
                    sx={{ color: "#1a73e8", display: "block", mt: 0.5 }}
                >
                    {footerLabel}
                </Typography>
            </Box>
        </Box>
    );
}
