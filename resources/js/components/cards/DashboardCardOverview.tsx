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
    return (
        <>
            <Box
                sx={{
                    p: 2,
                    borderRadius: 0.5,
                    border: "1px solid #ddd",
                    height: "auto",
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                    }}
                >
                    <Typography color="textPrimary">{title}</Typography>
                    <Typography variant="h5" fontFamily="Google Sans Code">
                        {value}
                    </Typography>
                </Box>
                <Box
                    sx={{
                        py: 5,
                        position: "relative",
                    }}
                >
                    <Box
                        sx={{
                            position: "absolute",
                            bottom: 0,
                        }}
                    >
                        {rateType ? (
                            <Typography
                                variant="body2"
                                component="div"
                                display="flex"
                                alignItems="center"
                            >
                                {rateType === "error" ? (
                                    <ArrowDownward
                                        sx={{ fontSize: 15 }}
                                        color="error"
                                    />
                                ) : (
                                    <ArrowUpward
                                        sx={{ fontSize: 15 }}
                                        color="success"
                                    />
                                )}
                                <Typography
                                    color={rateType}
                                    variant="body2"
                                    component="span"
                                >
                                    {rateValue}
                                </Typography>
                                <Box sx={{ mx: 0.3 }} />
                                <Typography
                                    component="span"
                                    color="textPrimary"
                                    variant="body2"
                                >
                                    {rateLabel}
                                </Typography>
                            </Typography>
                        ) : (
                            <Typography variant="body2" component="div">
                                {rateLabel}
                            </Typography>
                        )}
                        <Typography variant="caption" color="primary">
                            {footerLabel}
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            position: "absolute",
                            bottom: 0,
                            right: 0,
                        }}
                    >
                        <Avatar
                            src={iconSrc}
                            sx={{
                                width: iconSize,
                                height: "auto",
                            }}
                            variant="square"
                        />
                    </Box>
                </Box>
            </Box>
        </>
    );
}
