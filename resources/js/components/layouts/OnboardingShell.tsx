import { ReactNode, useState } from "react";
import { Box, Divider } from "@mui/material";
import { LogoutRounded } from "@mui/icons-material";
import { router } from "@inertiajs/react";
import AppLogo from "../utils/AppLogo";
import ThemeModeToggle from "../utils/ThemeModeToggle";
import StyledButton from "../utils/StyledButton";

// New agents' onboarding (/welcome): full page, no sidebar — logo, theme switch and sign out on top. Outside AppLayout, so
// it scrolls itself.
export default function OnboardingShell({ children }: { children: ReactNode }) {
    const [leaving, setLeaving] = useState(false);

    return (
        <Box sx={{ height: "100vh", "@supports (height: 100dvh)": { height: "100dvh" }, overflowY: "auto", display: "flex", flexDirection: "column", backgroundColor: "var(--lr-surface)" }}>
            <Box component="header" sx={{ px: { xs: 2, sm: 3 }, py: 1, display: "flex", alignItems: "center", gap: 1 }}>
                <AppLogo sx={{ width: 70 }} />
                <Box sx={{ flex: 1 }} />
                <ThemeModeToggle />
                <StyledButton
                    size="small"
                    startIcon={<LogoutRounded />}
                    disabled={leaving}
                    onClick={() => router.post("/logout", {}, { onStart: () => setLeaving(true), onFinish: () => setLeaving(false) })}
                    sx={{ color: "var(--lr-text-secondary)" }}
                >
                    Sign out
                </StyledButton>
            </Box>
            <Divider sx={{ borderColor: "var(--lr-border)" }} />
            <Box sx={{ flex: "1 0 auto", display: "flex", justifyContent: "center", px: 2, py: { xs: 4, md: 6 } }}>
                <Box sx={{ width: "100%", maxWidth: 1100 }}>{children}</Box>
            </Box>
        </Box>
    );
}
