import { Box, Divider, Typography } from "@mui/material";
import { ArrowDownwardRounded, ArrowUpwardRounded } from "@mui/icons-material";

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

const RATE_COLORS = {
    success: { color: "var(--lr-success)", bg: "var(--lr-success-soft)" },
    error: { color: "var(--lr-error-strong)", bg: "var(--lr-error-soft)" },
    warning: { color: "var(--lr-warning)", bg: "var(--lr-warning-soft)" },
};

export default function DashboardCardOverview({
    title,
    value,
    rateType,
    rateValue,
    rateLabel,
    iconSrc,
    iconSize = 26,
    footerLabel,
}: DashboardCardOverviewProps) {
    const rate = rateType ? RATE_COLORS[rateType] : null;
    const RateIcon = rateType === "error" ? ArrowDownwardRounded : ArrowUpwardRounded;

    return (
        <Box
            sx={{
                borderRadius: 3,
                border: "1px solid var(--lr-border)",
                backgroundColor: "var(--lr-surface)",
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
            <Box sx={{ p: 2.5, flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            backgroundColor: "var(--lr-surface-container)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                        }}
                    >
                        <Box
                            component="img"
                            src={iconSrc}
                            alt=""
                            sx={{ width: iconSize, height: "auto" }}
                        />
                    </Box>
                    <Typography variant="body2" sx={{ color: "var(--lr-text-body)", fontWeight: 500 }}>
                        {title}
                    </Typography>
                </Box>

                <Typography
                    fontFamily="Google Sans Code"
                    sx={{
                        fontSize: 30,
                        fontWeight: 400,
                        color: "var(--lr-text-primary)",
                        mt: 2,
                        lineHeight: 1.2,
                        wordBreak: "break-word",
                    }}
                >
                    {typeof value === "number" ? value.toLocaleString() : value}
                </Typography>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.5 }}>
                    {rate && (
                        <Box
                            sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 0.25,
                                px: 1,
                                py: 0.25,
                                borderRadius: 99,
                                color: rate.color,
                                backgroundColor: rate.bg,
                            }}
                        >
                            <RateIcon sx={{ fontSize: 14 }} />
                            <Typography variant="caption" sx={{ fontWeight: 500 }}>
                                {rateValue}
                            </Typography>
                        </Box>
                    )}
                    <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                        {rateLabel}
                    </Typography>
                </Box>
            </Box>

            <Divider sx={{ borderColor: "var(--lr-border)" }} />
            <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)", px: 2.5, py: 1.25 }}>
                {footerLabel}
            </Typography>
        </Box>
    );
}
