import { useRef, useState } from "react";
import {
    Box,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    LinearProgress,
    Typography,
} from "@mui/material";
import { DeleteOutlineRounded, PhotoCameraOutlined } from "@mui/icons-material";
import { router, useForm } from "@inertiajs/react";
import StyledButton from "../utils/StyledButton";
import UserAvatar from "../utils/user/UserAvatar";
import { compressImage } from "../../helpers/compressImage";

interface ProfilePhotoCardProps {
    name: string;
    email: string;
    role: string | null;
    avatar: string | null;
    maxPhotoKb: number;
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_ORIGINAL_MB = 20;

export default function ProfilePhotoCard({ name, email, role, avatar, maxPhotoKb }: ProfilePhotoCardProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [localError, setLocalError] = useState<string | null>(null);
    const [preparing, setPreparing] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [removing, setRemoving] = useState(false);
    const form = useForm<{ photo: File | null }>({ photo: null });

    const busy = preparing || form.processing || removing;
    const shownError = localError ?? form.errors.photo ?? null;

    const handleSelect = async (file: File | undefined) => {
        if (!file) return;
        setLocalError(null);
        form.clearErrors();

        if (ACCEPTED.indexOf(file.type) === -1) {
            setLocalError("Use a JPG, PNG or WEBP photo.");
            return;
        }
        if (file.size > MAX_ORIGINAL_MB * 1048576) {
            setLocalError(`The photo must be ${MAX_ORIGINAL_MB}MB or smaller.`);
            return;
        }

        // The server crops to 512px anyway; shrinking first keeps the upload small on mobile data.
        setPreparing(true);
        const photo = await compressImage(file, { maxDimension: 1024, quality: 0.85 });
        setPreparing(false);

        if (photo.size > maxPhotoKb * 1024) {
            setLocalError("This photo is still too large for the server after compression.");
            return;
        }

        const objectUrl = URL.createObjectURL(photo);
        setPreview(objectUrl);

        form.transform(() => ({ photo }));
        form.post("/profile/photo", {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => {
                URL.revokeObjectURL(objectUrl);
                setPreview(null);
            },
        });
    };

    const handleRemove = () => {
        setConfirmRemove(false);
        router.delete("/profile/photo", {
            preserveScroll: true,
            onStart: () => setRemoving(true),
            onFinish: () => setRemoving(false),
        });
    };

    return (
        <Box
            sx={{
                border: "1px solid var(--lr-border)",
                borderRadius: 3,
                backgroundColor: "var(--lr-surface)",
                p: 3,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
            }}
        >
            <Box sx={{ position: "relative" }}>
                <UserAvatar
                    name={name}
                    src={preview ?? avatar}
                    size={120}
                    sx={{
                        border: "4px solid var(--lr-surface)",
                        boxShadow: "0 1px 3px rgba(60,64,67,.3)",
                        opacity: busy ? 0.6 : 1,
                        transition: "opacity 0.15s",
                    }}
                />
            </Box>

            <Typography sx={{ mt: 2, fontSize: 18, fontWeight: 500, color: "var(--lr-text-primary)", overflowWrap: "anywhere" }}>
                {name}
            </Typography>
            {role && (
                <Box
                    sx={{
                        mt: 0.75,
                        px: 1.25,
                        py: 0.25,
                        borderRadius: 99,
                        backgroundColor: "var(--lr-primary-soft)",
                        color: "var(--lr-primary)",
                    }}
                >
                    <Typography variant="caption" sx={{ fontWeight: 500 }}>
                        {role}
                    </Typography>
                </Box>
            )}
            <Typography variant="body2" sx={{ mt: 0.75, color: "var(--lr-text-secondary)", overflowWrap: "anywhere" }}>
                {email}
            </Typography>

            {busy && (
                <Box sx={{ width: "100%", mt: 2 }}>
                    <LinearProgress
                        variant={form.progress ? "determinate" : "indeterminate"}
                        value={form.progress?.percentage}
                        sx={{ borderRadius: 99 }}
                    />
                    <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)", display: "block", mt: 0.5 }}>
                        {removing ? "Removing photo…" : preparing ? "Compressing photo…" : "Uploading photo…"}
                    </Typography>
                </Box>
            )}

            {shownError && (
                <Typography role="alert" variant="caption" sx={{ color: "var(--lr-error)", mt: 1.5, display: "block" }}>
                    {shownError}
                </Typography>
            )}

            <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 1, mt: 2.5 }}>
                <StyledButton
                    variant="contained"
                    size="small"
                    startIcon={<PhotoCameraOutlined />}
                    disabled={busy}
                    onClick={() => inputRef.current?.click()}
                    sx={{
                        px: 2,
                        backgroundColor: "var(--lr-primary)",
                        ":hover": { backgroundColor: "var(--lr-primary-hover)" },
                    }}
                >
                    {avatar ? "Change photo" : "Upload photo"}
                </StyledButton>
                {avatar && (
                    <StyledButton
                        variant="text"
                        size="small"
                        startIcon={<DeleteOutlineRounded />}
                        disabled={busy}
                        onClick={() => setConfirmRemove(true)}
                        sx={{ px: 2, color: "var(--lr-error)", ":hover": { backgroundColor: "var(--lr-error-soft)" } }}
                    >
                        Remove
                    </StyledButton>
                )}
            </Box>
            <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)", mt: 1.5 }}>
                JPG, PNG or WEBP · up to {MAX_ORIGINAL_MB}MB · cropped to a square
            </Typography>

            <input
                ref={inputRef}
                type="file"
                hidden
                accept={ACCEPTED.join(",")}
                onChange={(e) => {
                    handleSelect(e.target.files?.[0]);
                    // Reset so choosing the same photo again still triggers an upload.
                    e.target.value = "";
                }}
            />

            <Dialog open={confirmRemove} onClose={() => setConfirmRemove(false)}>
                <DialogTitle>Remove profile photo?</DialogTitle>
                <DialogContent>
                    <DialogContentText>Your initials will be shown instead.</DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <StyledButton onClick={() => setConfirmRemove(false)} sx={{ color: "var(--lr-text-secondary)" }}>
                        Cancel
                    </StyledButton>
                    <StyledButton
                        variant="contained"
                        onClick={handleRemove}
                        sx={{ backgroundColor: "var(--lr-error)", color: "var(--lr-surface)", ":hover": { backgroundColor: "var(--lr-error-strong)" } }}
                    >
                        Remove
                    </StyledButton>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
