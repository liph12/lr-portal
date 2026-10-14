import { KeyboardEvent, PointerEvent, useEffect, useRef, useState, WheelEvent } from "react";
import { Box, Dialog, DialogActions, DialogContent, DialogTitle, Slider, Typography } from "@mui/material";
import { ZoomInRounded, ZoomOutRounded } from "@mui/icons-material";
import StyledButton from "../StyledButton";

interface PhotoCropperProps {
    // The chosen photo; the dialog is open while there is one.
    file: File | null;
    onCancel: () => void;
    // The square crop, as a JPEG.
    onCrop: (cropped: File) => void;
}

// The crop square on screen (smaller on narrow phones), and the photo it produces (the server makes its 512px WebP from it).
const MAX_VIEW = 300;
const OUTPUT = 1024;
const MAX_ZOOM = 4;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// A profile photo cropper: the photo fills a square with a round guide (avatars are round); drag to reposition, scroll /
// pinch / the slider to zoom, arrow keys too. No library: a canvas draws the chosen square.
export default function PhotoCropper({ file, onCancel, onCrop }: PhotoCropperProps) {
    const view = typeof window === "undefined" ? MAX_VIEW : Math.min(MAX_VIEW, window.innerWidth - 96);
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [saving, setSaving] = useState(false);
    const pointers = useRef(new Map<number, { x: number; y: number }>());
    const pinch = useRef<{ distance: number; zoom: number } | null>(null);

    useEffect(() => {
        setImage(null);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        if (!file) return;
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => setImage(img);
        img.src = url;
        return () => URL.revokeObjectURL(url);
    }, [file]);

    // The photo covers the square at zoom 1; offsets keep it covering it.
    const base = image ? Math.max(view / image.naturalWidth, view / image.naturalHeight) : 1;
    const scale = base * zoom;
    const shown = image ? { w: image.naturalWidth * scale, h: image.naturalHeight * scale } : { w: view, h: view };
    const fit = (o: { x: number; y: number }, z = zoom) => {
        if (!image) return o;
        const w = image.naturalWidth * base * z;
        const h = image.naturalHeight * base * z;
        return { x: clamp(o.x, -(w - view) / 2, (w - view) / 2), y: clamp(o.y, -(h - view) / 2, (h - view) / 2) };
    };
    const zoomTo = (z: number) => {
        const next = clamp(z, 1, MAX_ZOOM);
        setZoom(next);
        setOffset((o) => fit(o, next));
    };

    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom };
        }
    };
    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        const last = pointers.current.get(e.pointerId);
        if (!last) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.current.size === 2 && pinch.current) {
            const [a, b] = [...pointers.current.values()];
            zoomTo((pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.distance);
            return;
        }
        setOffset((o) => fit({ x: o.x + e.clientX - last.x, y: o.y + e.clientY - last.y }));
    };
    const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
        pointers.current.delete(e.pointerId);
        if (pointers.current.size < 2) pinch.current = null;
    };
    const onWheel = (e: WheelEvent<HTMLDivElement>) => zoomTo(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        const step = 12;
        const moves: Record<string, { x: number; y: number }> = { ArrowLeft: { x: step, y: 0 }, ArrowRight: { x: -step, y: 0 }, ArrowUp: { x: 0, y: step }, ArrowDown: { x: 0, y: -step } };
        if (moves[e.key]) {
            e.preventDefault();
            setOffset((o) => fit({ x: o.x + moves[e.key].x, y: o.y + moves[e.key].y }));
        } else if (e.key === "+" || e.key === "=") zoomTo(zoom + 0.2);
        else if (e.key === "-") zoomTo(zoom - 0.2);
    };

    // The part of the photo inside the square, drawn at OUTPUT × OUTPUT.
    const crop = () => {
        if (!image || !file) return;
        setSaving(true);
        const size = view / scale;
        const sx = image.naturalWidth / 2 - (view / 2 + offset.x) / scale;
        const sy = image.naturalHeight / 2 - (view / 2 + offset.y) / scale;
        const canvas = document.createElement("canvas");
        canvas.width = OUTPUT;
        canvas.height = OUTPUT;
        const ctx = canvas.getContext("2d");
        if (!ctx) return setSaving(false);
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(image, sx, sy, size, size, 0, 0, OUTPUT, OUTPUT);
        canvas.toBlob(
            (blob) => {
                setSaving(false);
                if (blob) onCrop(new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-cropped.jpg`, { type: "image/jpeg" }));
            },
            "image/jpeg",
            0.9,
        );
    };

    return (
        <Dialog open={!!file} onClose={saving ? undefined : onCancel} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontSize: 18 }}>Crop your photo</DialogTitle>
            <DialogContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <Box
                    role="application"
                    aria-label="Photo crop area. Drag or use the arrow keys to move the photo; plus and minus zoom."
                    tabIndex={0}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    onWheel={onWheel}
                    onKeyDown={onKeyDown}
                    sx={{
                        position: "relative",
                        width: view,
                        height: view,
                        overflow: "hidden",
                        borderRadius: 3,
                        backgroundColor: "var(--lr-surface-container)",
                        cursor: "grab",
                        touchAction: "none",
                        userSelect: "none",
                        ":active": { cursor: "grabbing" },
                        ":focus-visible": { outline: "2px solid var(--lr-primary)", outlineOffset: 2 },
                    }}
                >
                    {image && (
                        <Box
                            component="img"
                            src={image.src}
                            alt=""
                            draggable={false}
                            sx={{
                                position: "absolute",
                                left: (view - shown.w) / 2 + offset.x,
                                top: (view - shown.h) / 2 + offset.y,
                                width: shown.w,
                                height: shown.h,
                                maxWidth: "none",
                                pointerEvents: "none",
                            }}
                        />
                    )}
                    {/* The round guide: everything outside it is dimmed (avatars are shown round). */}
                    <Box sx={{ position: "absolute", inset: 0, borderRadius: "50%", boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)", border: "2px solid rgba(255,255,255,0.85)", pointerEvents: "none" }} />
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%", maxWidth: view }}>
                    <ZoomOutRounded fontSize="small" sx={{ color: "var(--lr-text-secondary)" }} />
                    <Slider
                        size="small"
                        min={1}
                        max={MAX_ZOOM}
                        step={0.01}
                        value={zoom}
                        onChange={(_, v) => zoomTo(v as number)}
                        aria-label="Zoom"
                        sx={{ color: "var(--lr-primary)" }}
                    />
                    <ZoomInRounded fontSize="small" sx={{ color: "var(--lr-text-secondary)" }} />
                </Box>
                <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)", textAlign: "center" }}>
                    Drag to reposition · scroll or pinch to zoom
                </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <StyledButton onClick={onCancel} disabled={saving} sx={{ color: "var(--lr-text-secondary)" }}>
                    Cancel
                </StyledButton>
                <StyledButton
                    variant="contained"
                    onClick={crop}
                    loading={saving}
                    disabled={!image}
                    sx={{ px: 3, backgroundColor: "var(--lr-primary)", color: "var(--lr-on-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } }}
                >
                    Use this photo
                </StyledButton>
            </DialogActions>
        </Dialog>
    );
}
