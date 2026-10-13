import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { SupervisorAccountRounded } from "@mui/icons-material";
import { router } from "@inertiajs/react";
import StyledButton from "../StyledButton";
import useAuthUser from "../../../hooks/useAuthUser";

// On every page while a superadmin is signed in as someone, so it's never mistaken for their own account.
export default function ImpersonationBanner() {
    const user = useAuthUser();
    const [leaving, setLeaving] = useState(false);

    if (!user?.impersonator) return null;

    return (
        <Box
            role="status"
            sx={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1,
                px: { xs: 2, sm: 3 },
                py: 0.75,
                backgroundColor: "var(--lr-error-soft)",
                borderBottom: "1px solid var(--lr-border)",
            }}
        >
            <SupervisorAccountRounded sx={{ fontSize: 18, color: "var(--lr-error)" }} />
            <Typography variant="body2" sx={{ color: "var(--lr-text-body)", flex: 1, minWidth: 200 }}>
                You're signed in as <strong>{user.name}</strong>. Anything you do is recorded as them (and as you, {user.impersonator.name}).
            </Typography>
            <StyledButton
                size="small"
                variant="contained"
                loading={leaving}
                disabled={leaving}
                onClick={() => {
                    // At once, not on the request's start: a quick double click would otherwise send two.
                    setLeaving(true);
                    router.delete("/impersonate", { onFinish: () => setLeaving(false) });
                }}
                sx={{ backgroundColor: "var(--lr-primary)", color: "var(--lr-on-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } }}
            >
                Return to my account
            </StyledButton>
        </Box>
    );
}
