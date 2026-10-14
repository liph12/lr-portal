import { PointerEvent, useEffect, useRef, useState } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { DrawRounded, RestartAltRounded } from "@mui/icons-material";

interface SignaturePadProps {
    // A PNG data URL of what was drawn (transparent background), or null when cleared.
    onChange: (dataUrl: string | null) => void;
    error?: string | null;
    disabled?: boolean;
    // Ink colour; the slip's value colour unless given (the LR ID signs in the card's blue).
    ink?: string;
    // The caption under the pad.
    hint?: string;
    // Without the caption row (and its Clear), when the surrounding form has its own controls.
    showFooter?: boolean;
    // The pad's height in CSS pixels.
    height?: number;
}

const HEIGHT = 180;

// Sign with a mouse, finger or stylus. The canvas is drawn at the screen's pixel density, so the signature stays sharp
// when it's stamped onto the slip.
export default function SignaturePad({
    onChange,
    error = null,
    disabled = false,
    ink,
    hint = "Your signature, name and today's date are stamped on the commission slip.",
    showFooter = true,
    height = HEIGHT,
}: SignaturePadProps) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const last = useRef<{ x: number; y: number } | null>(null);
    const [signed, setSigned] = useState(false);
    // A ref as well: the first stroke ends before React re-renders with `signed`.
    const inked = useRef(false);

    useEffect(() => {
        const el = canvas.current;
        if (!el) return;
        const ratio = Math.max(window.devicePixelRatio || 1, 2);
        el.width = el.clientWidth * ratio;
        el.height = height * ratio;
        const ctx = el.getContext("2d");
        if (!ctx) return;
        ctx.scale(ratio, ratio);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        // Ink matches the slip's value colour, so the signature reads as written on it.
        ctx.strokeStyle =
            ink ||
            getComputedStyle(document.documentElement)
                .getPropertyValue("--lr-paper-ink")
                .trim() ||
            "black";
        ctx.lineWidth = 2.6;
    }, [ink, height]);

    const point = (e: PointerEvent<HTMLCanvasElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const start = (e: PointerEvent<HTMLCanvasElement>) => {
        if (disabled) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        last.current = point(e);
    };

    const move = (e: PointerEvent<HTMLCanvasElement>) => {
        const ctx = canvas.current?.getContext("2d");
        if (!last.current || !ctx) return;
        const next = point(e);
        // A curve through the midpoint smooths the stroke between pointer samples.
        const mid = {
            x: (last.current.x + next.x) / 2,
            y: (last.current.y + next.y) / 2,
        };
        ctx.beginPath();
        ctx.moveTo(last.current.x, last.current.y);
        ctx.quadraticCurveTo(last.current.x, last.current.y, mid.x, mid.y);
        ctx.lineTo(next.x, next.y);
        ctx.stroke();
        last.current = next;
        inked.current = true;
        if (!signed) setSigned(true);
    };

    const end = () => {
        if (!last.current) return;
        last.current = null;
        if (canvas.current && inked.current)
            onChange(canvas.current.toDataURL("image/png"));
    };

    const clear = () => {
        const el = canvas.current;
        el?.getContext("2d")?.clearRect(0, 0, el.width, el.height);
        inked.current = false;
        setSigned(false);
        onChange(null);
    };

    return (
        <Box>
            <Box
                sx={{
                    position: "relative",
                    borderRadius: 3,
                    border: "1.5px dashed",
                    borderColor: error
                        ? "var(--lr-error)"
                        : "var(--lr-outline)",
                    // Always light, like paper, so the dark ink shows in dark mode too.
                    backgroundColor: "var(--lr-paper)",
                    overflow: "hidden",
                }}
            >
                <Box
                    component="canvas"
                    ref={canvas}
                    aria-label="Signature pad: sign here"
                    onPointerDown={start}
                    onPointerMove={move}
                    onPointerUp={end}
                    onPointerLeave={end}
                    onPointerCancel={end}
                    sx={{
                        display: "block",
                        width: "100%",
                        height,
                        touchAction: "none",
                        cursor: disabled ? "not-allowed" : "crosshair",
                    }}
                />
                {!signed && (
                    <Box
                        sx={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 1,
                            pointerEvents: "none",
                            color: "var(--lr-paper-muted)",
                        }}
                    >
                        <DrawRounded fontSize="small" />
                        <Typography variant="body2">Sign here</Typography>
                    </Box>
                )}
                <Box
                    sx={{
                        position: "absolute",
                        left: 24,
                        right: 24,
                        bottom: 40,
                        borderBottom: "1px solid var(--lr-paper-rule)",
                        pointerEvents: "none",
                    }}
                />
            </Box>
            {showFooter && (
                <Box sx={{ display: "flex", alignItems: "center", mt: 0.75 }}>
                    <Typography
                        variant="caption"
                        sx={{
                            flex: 1,
                            color: error
                                ? "var(--lr-error)"
                                : "var(--lr-text-secondary)",
                        }}
                    >
                        {error ?? hint}
                    </Typography>
                    <ButtonBase
                        onClick={clear}
                        disabled={!signed || disabled}
                        sx={{
                            gap: 0.5,
                            px: 1,
                            py: 0.5,
                            borderRadius: 2,
                            fontSize: 13,
                            color: "var(--lr-primary)",
                            opacity: signed ? 1 : 0.4,
                        }}
                    >
                        <RestartAltRounded sx={{ fontSize: 16 }} />
                        Clear
                    </ButtonBase>
                </Box>
            )}
        </Box>
    );
}
