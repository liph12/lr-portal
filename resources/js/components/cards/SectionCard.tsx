import { ReactNode } from "react";
import { Box, Divider, Typography } from "@mui/material";

interface SectionCardProps {
    title: string;
    subtitle?: string;
    children: ReactNode;
    // Fill the grid cell, so cards side by side end level (only when it's the cell's one card).
    fill?: boolean;
}

export default function SectionCard({ title, subtitle, children, fill = false }: SectionCardProps) {
    return (
        <Box
            component="section"
            sx={{
                border: "1px solid var(--lr-border)",
                borderRadius: 3,
                backgroundColor: "var(--lr-surface)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                ...(fill ? { height: "100%" } : {}),
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
            <Box sx={{ p: { xs: 2, sm: 3 }, flex: 1, display: "flex", flexDirection: "column" }}>{children}</Box>
        </Box>
    );
}
