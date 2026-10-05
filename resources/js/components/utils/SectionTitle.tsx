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
                <Typography sx={{ fontSize: 18, fontWeight: 500, color: "var(--lr-text-primary)" }}>
                    {title}
                </Typography>
                {subtitle && (
                    <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", mt: 0.25 }}>
                        {subtitle}
                    </Typography>
                )}
            </Box>
            {action}
        </Box>
    );
}
