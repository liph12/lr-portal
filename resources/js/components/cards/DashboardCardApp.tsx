import { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { ArrowForwardRounded } from "@mui/icons-material";
import { Link } from "@inertiajs/react";

interface DashboardCardAppProps {
    title: string;
    subTitle: string;
    description: string;
    // An image, or a drawn icon (SpotIcon) that brings its own tile.
    icon: string | ReactNode;
    // Where the card opens; without one it is a placeholder for a tool that is not in the portal yet.
    href?: string;
    // A file or site outside the portal: a plain link in a new tab.
    external?: boolean;
}

export default function DashboardCardApp({
    title,
    subTitle,
    description,
    icon,
    href,
    external,
}: DashboardCardAppProps) {
    return (
        <Box
            component={href ? (external ? "a" : Link) : "div"}
            href={href}
            {...(external ? { target: "_blank", rel: "noopener" } : {})}
            sx={{
                textDecoration: "none",
                color: "inherit",
                p: 2.5,
                border: "1px solid var(--lr-border)",
                borderRadius: 3,
                height: "100%",
                minHeight: 196,
                display: "flex",
                flexDirection: "column",
                backgroundColor: "var(--lr-surface)",
                cursor: "pointer",
                transition: "box-shadow 0.2s ease, border-color 0.2s ease",
                "& .app-open": { opacity: 0, transform: "translateX(-4px)" },
                ":hover": {
                    borderColor: "transparent",
                    boxShadow:
                        "0 1px 3px rgba(60,64,67,.15), 0 4px 8px rgba(60,64,67,.1)",
                    "& .app-open": { opacity: 1, transform: "none" },
                },
            }}
        >
            {typeof icon === "string" ? (
                <Box
                    sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2.5,
                        backgroundColor: "var(--lr-surface-container)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                    }}
                >
                    <Box component="img" src={icon} alt="" sx={{ width: 26, height: "auto" }} />
                </Box>
            ) : (
                icon
            )}

            <Typography
                variant="body2"
                sx={{
                    mt: 2,
                    fontWeight: 500,
                    color: "var(--lr-text-primary)",
                    lineHeight: 1.4,
                }}
            >
                {title}
            </Typography>
            <Typography
                variant="caption"
                sx={{ color: "var(--lr-text-secondary)", fontWeight: 500 }}
            >
                {subTitle}
            </Typography>
            <Typography
                variant="caption"
                sx={{
                    mt: 1,
                    color: "var(--lr-text-secondary)",
                    lineHeight: 1.5,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                }}
            >
                {description}
            </Typography>

            <Box
                className="app-open"
                sx={{
                    mt: "auto",
                    pt: 1.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    color: "var(--lr-primary)",
                    transition: "opacity 0.2s ease, transform 0.2s ease",
                }}
            >
                <Typography variant="caption" sx={{ fontWeight: 500 }}>
                    Open
                </Typography>
                <ArrowForwardRounded sx={{ fontSize: 14 }} />
            </Box>
        </Box>
    );
}
