import { ReactNode } from "react";
import { Box, Divider, Typography } from "@mui/material";

interface SectionCardProps {
    title: string;
    subtitle?: string;
    children: ReactNode;
}

export default function SectionCard({ title, subtitle, children }: SectionCardProps) {
    return (
        <Box
            component="section"
            sx={{
                border: "1px solid var(--lr-border)",
                borderRadius: 3,
                backgroundColor: "var(--lr-surface)",
                overflow: "hidden",
            }}
        >
            <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2.5, pb: 2 }}>
                <Typography sx={{ fontSize: 16, fontWeight: 500, color: "var(--lr-text-primary)" }}>
                    {title}
                </Typography>
                {subtitle && (
                    <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", mt: 0.25 }}>
                        {subtitle}
                    </Typography>
                )}
            </Box>
            <Divider sx={{ borderColor: "var(--lr-border)" }} />
            <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>
        </Box>
    );
}
