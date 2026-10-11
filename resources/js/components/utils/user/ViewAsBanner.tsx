import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { VisibilityRounded } from "@mui/icons-material";
import { router } from "@inertiajs/react";
import StyledButton from "../StyledButton";
import useAuthUser from "../../../hooks/useAuthUser";

// Shown on every page while a superadmin previews another role, so the preview is never mistaken
// for their real access, and the way back is always one click away.
export default function ViewAsBanner() {
    const user = useAuthUser();
    const [leaving, setLeaving] = useState(false);

    if (!user?.viewing_as) return null;

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
                backgroundColor: "var(--lr-warning-soft)",
                borderBottom: "1px solid var(--lr-border)",
            }}
        >
            <VisibilityRounded sx={{ fontSize: 18, color: "var(--lr-warning)" }} />
            <Typography variant="body2" sx={{ color: "var(--lr-text-body)", flex: 1, minWidth: 200 }}>
                You're viewing the portal as <strong>{user.viewing_as}</strong>. Your own account is unchanged.
            </Typography>
            <StyledButton
                size="small"
                variant="contained"
                loading={leaving}
                onClick={() => router.delete("/view-as", { onStart: () => setLeaving(true), onFinish: () => setLeaving(false) })}
                sx={{ backgroundColor: "var(--lr-primary)", color: "var(--lr-on-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } }}
            >
                Return to Superadmin
            </StyledButton>
        </Box>
    );
}
