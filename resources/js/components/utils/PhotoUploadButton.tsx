import { ChangeEvent, ReactNode, useRef, useState } from "react";
import { Box, ButtonBase, CircularProgress } from "@mui/material";
import { PhotoCameraRounded } from "@mui/icons-material";
import { router } from "@inertiajs/react";
import { compressImage, isCompressibleImage } from "../../helpers/compressImage";

interface PhotoUploadButtonProps {
    // POSTed as multipart { photo }.
    url: string;
    label: string;
    // What to show (usually the current photo / avatar); a camera badge is overlaid.
    children: ReactNode;
    disabled?: boolean;
}

// Click the picture to replace it: compressed in the browser first, cropped to a square on the server.
export default function PhotoUploadButton({ url, label, children, disabled = false }: PhotoUploadButtonProps) {
    const input = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);

    const upload = async (e: ChangeEvent<HTMLInputElement>) => {
        const original = e.target.files?.[0];
        e.target.value = "";
        if (!original) return;

        setBusy(true);
        const photo = isCompressibleImage(original) ? await compressImage(original) : original;
        router.post(url, { photo }, { forceFormData: true, preserveScroll: true, onFinish: () => setBusy(false) });
    };

    return (
        <ButtonBase
            aria-label={label}
            title={label}
            disabled={disabled || busy}
            onClick={(e) => {
                e.stopPropagation();
                input.current?.click();
            }}
            sx={{ position: "relative", borderRadius: "50%", "&:hover .lr-photo-badge, &:focus-visible .lr-photo-badge": { opacity: 1 } }}
        >
            {children}
            <Box
                className="lr-photo-badge"
                sx={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(0,0,0,.45)",
                    color: "var(--lr-on-primary)",
                    opacity: busy ? 1 : 0,
                    transition: "opacity .15s",
                }}
            >
                {busy ? <CircularProgress size={14} sx={{ color: "inherit" }} /> : <PhotoCameraRounded sx={{ fontSize: 14 }} />}
            </Box>
            <input ref={input} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={upload} />
        </ButtonBase>
    );
}
