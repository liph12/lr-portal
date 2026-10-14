import { Box, Typography } from "@mui/material";
import { ArrowBackRounded, ArrowForwardRounded } from "@mui/icons-material";
import { Link, router, useForm } from "@inertiajs/react";
import OnboardingShell from "../../../components/layouts/OnboardingShell";
import ProfilePhotoCard from "../../../components/cards/ProfilePhotoCard";
import StyledButton from "../../../components/utils/StyledButton";
import useAuthUser from "../../../hooks/useAuthUser";

// Onboarding step 1: the profile photo, chosen and cropped (ProfilePhotoCard → POST /profile/photo). Continue finishes the
// step (POST /welcome/photo); an agent who already has a photo can keep it.
function Photo({ maxPhotoKb }: { maxPhotoKb: number }) {
    const user = useAuthUser();
    const done = useForm({});
    const hasPhoto = !!user?.avatar;
    const photoError = (done.errors as Record<string, string | undefined>).photo;

    return (
        <OnboardingShell>
            <Box sx={{ maxWidth: 560, mx: "auto" }}>
                <Link href="/welcome" style={{ textDecoration: "none" }}>
                    <StyledButton size="small" startIcon={<ArrowBackRounded />} sx={{ mb: 1, px: 1, color: "var(--lr-primary)" }}>
                        Back
                    </StyledButton>
                </Link>
                <Typography variant="caption" sx={{ display: "block", fontWeight: 600, letterSpacing: "0.12em", color: "var(--lr-primary)" }}>
                    STEP 1 · PROFILE PHOTO
                </Typography>
                <Typography component="h1" sx={{ mt: 0.5, fontSize: 30, color: "var(--lr-text-primary)" }}>
                    {hasPhoto ? "Looking good" : "Add your profile photo"}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, mb: 3, color: "var(--lr-text-secondary)" }}>
                    Clients and your team see it on your profile and business card. Use a clear, recent photo of your face — you can crop it before it's saved.
                </Typography>

                <ProfilePhotoCard name={user?.name ?? ""} email={user?.email ?? ""} role={user?.role ?? null} avatar={user?.avatar ?? null} maxPhotoKb={maxPhotoKb} />

                {photoError && (
                    <Typography variant="body2" sx={{ mt: 1.5, color: "var(--lr-error)" }}>
                        {photoError}
                    </Typography>
                )}
                <Box sx={{ mt: 3, display: "flex", gap: 1.5, justifyContent: "space-between", flexWrap: "wrap" }}>
                    <StyledButton onClick={() => router.post("/welcome/skip")} sx={{ color: "var(--lr-text-secondary)" }}>
                        Skip for now
                    </StyledButton>
                    <StyledButton
                        variant="contained"
                        endIcon={<ArrowForwardRounded />}
                        disabled={!hasPhoto || done.processing}
                        onClick={() => done.post("/welcome/photo")}
                        sx={{ px: 3, backgroundColor: "var(--lr-primary)", color: "var(--lr-on-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" }, "&.Mui-disabled": { backgroundColor: "var(--lr-surface-container)", color: "var(--lr-text-secondary)" } }}
                    >
                        {hasPhoto ? "Continue" : "Add a photo to continue"}
                    </StyledButton>
                </Box>
            </Box>
        </OnboardingShell>
    );
}

export default Photo;
