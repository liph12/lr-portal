import { ReactNode } from "react";
import { Box, Typography } from "@mui/material";

interface SectionTitleProps {
    title: string;
    subtitle?: string;
    action?: ReactNode;
}

export default function SectionTitle({ title, subtitle, action }: SectionTitleProps) {
    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: 2,
                mb: 2,
            }}
        >
            <Box>
                <Typography
                    component="h2"
                    sx={{
                        fontSize: { xs: 20, sm: 22 },
                        fontWeight: 600,
                        letterSpacing: "-0.01em",
                        lineHeight: 1.3,
                        color: "var(--lr-text-primary)",
                        display: "flex",
                        alignItems: "center",
                        gap: 1.25,
                        // A short red bar: the brand's highlight beside every page title.
                        "::before": { content: '""', width: 4, height: "0.9em", borderRadius: 2, backgroundColor: "var(--lr-accent)", flexShrink: 0 },
                    }}
                >
                    {title}
                </Typography>
                {subtitle && (
                    <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", mt: 0.5, pl: 1.875 }}>
                        {subtitle}
                    </Typography>
                )}
            </Box>
            {action}
        </Box>
    );
}
