import { useState } from "react";
import { Box, Stack, Tooltip } from "@mui/material";
import { HomeRounded, LoginRounded, LogoutRounded } from "@mui/icons-material";
import { Link, router } from "@inertiajs/react";
import useAuthUser from "../../hooks/useAuthUser";
import { leavePresence } from "../../helpers/presence";
import AppLogo from "../utils/AppLogo";
import ThemeModeToggle from "../utils/ThemeModeToggle";
import StyledButton from "../utils/StyledButton";
import UserAvatar from "../utils/user/UserAvatar";

const buttonSx = {
    px: 1.5,
    color: "var(--lr-text-body)",
    "& .MuiButton-startIcon": { color: "var(--lr-text-secondary)" },
    ":hover": { backgroundColor: "var(--lr-surface-hover)" },
};

// The dashboard navbar, reduced, for pages outside AppLayout that anyone may open (contact page, business profile):
// logo, Dashboard, theme, and Sign out for a signed-in user (Sign in otherwise).
export default function PublicHeader() {
    const user = useAuthUser();
    const [signingOut, setSigningOut] = useState(false);

    const signOut = () => {
        // Leave first so others see you go offline immediately, not when the socket times out.
        leavePresence();
        router.post("/logout", {}, { onStart: () => setSigningOut(true), onFinish: () => setSigningOut(false) });
    };

    return (
        <Box
            component="header"
            sx={{
                flexShrink: 0,
                py: 1,
                px: { xs: 1, sm: 2 },
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "var(--lr-surface)",
                borderBottom: "1px solid var(--lr-border)",
            }}
        >
            <AppLogo sx={{ width: 70 }} />
            <Stack direction="row" spacing={{ xs: 0, sm: 0.5 }} alignItems="center">
                {user ? (
                    <>
                        <Tooltip title="Dashboard">
                            <StyledButton component={Link} href={user.home} size="small" startIcon={<HomeRounded />} sx={buttonSx}>
                                <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Dashboard</Box>
                            </StyledButton>
                        </Tooltip>
                        <ThemeModeToggle />
                        <UserAvatar name={user.name} src={user.avatar} size={30} sx={{ mx: 0.5 }} />
                        <Tooltip title="Sign out">
                            <StyledButton size="small" onClick={signOut} disabled={signingOut} startIcon={<LogoutRounded />} sx={{ ...buttonSx, color: "var(--lr-error)", "& .MuiButton-startIcon": { color: "inherit" } }}>
                                <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>{signingOut ? "Signing out…" : "Sign out"}</Box>
                            </StyledButton>
                        </Tooltip>
                    </>
                ) : (
                    <>
                        <ThemeModeToggle />
                        <StyledButton component={Link} href="/login" size="small" startIcon={<LoginRounded />} sx={buttonSx}>
                            Sign in
                        </StyledButton>
                    </>
                )}
            </Stack>
        </Box>
    );
}
