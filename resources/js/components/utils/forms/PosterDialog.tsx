import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Checkbox, FormControlLabel, FormHelperText, Typography } from "@mui/material";
import { ImageOutlined } from "@mui/icons-material";
import { useForm } from "@inertiajs/react";
import FormDialog from "./FormDialog";
import FieldLabel from "./FieldLabel";
import StyledTextField from "../StyledTextField";
import StyledButton from "../StyledButton";
import { compressImage } from "../../../helpers/compressImage";
import { ManagedPoster } from "../../../types/app-data-types";

interface PosterDialogProps {
    open: boolean;
    // Editing this one; null = adding a new poster.
    poster: ManagedPoster | null;
    maxImageKb: number;
    onClose: () => void;
}

interface PosterForm {
    title: string;
    image: File | null;
    link_url: string;
    starts_on: string;
    ends_on: string;
    is_active: boolean;
}

const BASE = "/superadmin/settings/posters";

// Adding or editing a dashboard poster: the image (compressed in the browser first), a title, an optional link and the days it shows.
export default function PosterDialog({ open, poster, maxImageKb, onClose }: PosterDialogProps) {
    const form = useForm<PosterForm>({ title: "", image: null, link_url: "", starts_on: "", ends_on: "", is_active: true });
    const [preparing, setPreparing] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const input = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) return;
        form.clearErrors();
        setLocalError(null);
        form.setData({
            title: poster?.title ?? "",
            image: null,
            link_url: poster?.link_url ?? "",
            starts_on: poster?.starts_on ?? "",
            ends_on: poster?.ends_on ?? "",
            is_active: poster?.is_active ?? true,
        });
    }, [open, poster]);

    const preview = useMemo(() => (form.data.image ? URL.createObjectURL(form.data.image) : (poster?.image_url ?? null)), [form.data.image, poster]);
    useEffect(() => () => {
        if (form.data.image && preview) URL.revokeObjectURL(preview);
    }, [preview]);

    const pick = async (file: File | undefined) => {
        if (!file) return;
        setLocalError(null);
        if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setLocalError("Use a JPG, PNG or WEBP image.");
        setPreparing(true);
        const compressed = await compressImage(file);
        setPreparing(false);
        if (compressed.size > maxImageKb * 1024) return setLocalError(`That image is too large even after compressing (limit ${Math.round(maxImageKb / 1024)} MB).`);
        form.setData("image", compressed);
    };

    const submit = () => {
        const options = { forceFormData: true, preserveScroll: true, onSuccess: onClose };
        if (poster) {
            // Files can't ride a real PUT in PHP; Laravel reads the spoofed method.
            form.transform((d) => ({ ...d, _method: "put" }));
            form.post(`${BASE}/${poster.id}`, options);
        } else {
            form.transform((d) => d);
            form.post(BASE, options);
        }
    };

    return (
        <FormDialog open={open} title={poster ? "Edit poster" : "Add a poster"} submitLabel={poster ? "Save" : "Add poster"} processing={form.processing || preparing} onSubmit={submit} onClose={onClose}>
            <div>
                <FieldLabel text="Image" required={!poster} />
                <Box
                    role="button"
                    tabIndex={0}
                    onClick={() => input.current?.click()}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
                    sx={{
                        position: "relative",
                        aspectRatio: "1200 / 515",
                        borderRadius: 2,
                        overflow: "hidden",
                        cursor: "pointer",
                        border: "1px dashed var(--lr-outline)",
                        backgroundColor: "var(--lr-surface-container)",
                        display: "grid",
                        placeItems: "center",
                        ":focus-visible": { outline: "2px solid var(--lr-primary)", outlineOffset: 2 },
                    }}
                >
                    {preview ? (
                        <Box component="img" src={preview} alt="" sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                        <Box sx={{ textAlign: "center", color: "var(--lr-text-secondary)" }}>
                            <ImageOutlined />
                            <Typography variant="body2">{preparing ? "Preparing the image…" : "Choose an image"}</Typography>
                        </Box>
                    )}
                </Box>
                <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} />
                <Box sx={{ mt: 0.75, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <FormHelperText sx={{ m: 0, flex: 1, color: localError || form.errors.image ? "var(--lr-error)" : "var(--lr-text-secondary)" }}>
                        {localError ?? form.errors.image ?? "Best at 1200 × 515 px (about 7 : 3). JPG, PNG or WEBP."}
                    </FormHelperText>
                    {preview && (
                        <StyledButton size="small" onClick={() => input.current?.click()} sx={{ color: "var(--lr-primary)" }}>
                            Replace image
                        </StyledButton>
                    )}
                </Box>
            </div>
            <div>
                <FieldLabel text="Title" required />
                <StyledTextField name="title" value={form.data.title} error={form.errors.title ?? null} handleChange={(e) => form.setData("title", e.target.value)} props={{ placeholder: "e.g. National Real Estate Convention 2026" }} />
            </div>
            <div>
                <FieldLabel text="Opens when clicked (optional)" />
                <StyledTextField name="link_url" value={form.data.link_url} error={form.errors.link_url ?? null} handleChange={(e) => form.setData("link_url", e.target.value)} props={{ placeholder: "/natcon  or  https://…" }} />
            </div>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                <div>
                    <FieldLabel text="Show from (optional)" />
                    <StyledTextField type="date" name="starts_on" value={form.data.starts_on} error={form.errors.starts_on ?? null} handleChange={(e) => form.setData("starts_on", e.target.value)} />
                </div>
                <div>
                    <FieldLabel text="Show until (optional)" />
                    <StyledTextField type="date" name="ends_on" value={form.data.ends_on} error={form.errors.ends_on ?? null} handleChange={(e) => form.setData("ends_on", e.target.value)} />
                </div>
            </Box>
            <FormControlLabel
                control={<Checkbox checked={form.data.is_active} onChange={(e) => form.setData("is_active", e.target.checked)} />}
                label={<Typography variant="body2">Show it on the dashboard</Typography>}
            />
        </FormDialog>
    );
}
