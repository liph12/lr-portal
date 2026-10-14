import { ReactNode } from "react";
import { Box, Divider, Link as MuiLink, Typography } from "@mui/material";
import { Link } from "@inertiajs/react";
import AppLogo from "../utils/AppLogo";
import ThemeModeToggle from "../utils/ThemeModeToggle";

interface AuthShellProps {
    children: ReactNode;
    // The content column's width (the stepper needs more than the email step).
    maxWidth?: number;
}

// The frame of the signed-out pages that aren't Login (agent registration): logo and theme switch on top, content centred.
// Outside AppLayout, so it scrolls itself.
export default function AuthShell({ children, maxWidth = 460 }: AuthShellProps) {
    return (
        <Box
            sx={{
                height: "100vh",
                "@supports (height: 100dvh)": { height: "100dvh" },
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                backgroundColor: "var(--lr-surface)",
            }}
        >
            <Box component="header" sx={{ px: { xs: 2, sm: 3 }, py: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <AppLogo sx={{ width: 70 }} />
                <ThemeModeToggle />
            </Box>
            <Divider sx={{ borderColor: "var(--lr-border)" }} />
            <Box sx={{ flex: "1 0 auto", display: "flex", justifyContent: "center", px: 2, py: { xs: 4, sm: 6 } }}>
                <Box sx={{ width: "100%", maxWidth }}>
                    {children}
                    <Typography variant="body2" sx={{ mt: 4, textAlign: "center", color: "var(--lr-text-secondary)" }}>
                        Already have an account?{" "}
                        <MuiLink component={Link} href="/login" sx={{ color: "var(--lr-primary)", fontWeight: 500 }}>
                            Sign in
                        </MuiLink>
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}
