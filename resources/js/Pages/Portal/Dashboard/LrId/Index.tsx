import {
    ChangeEvent,
    PointerEvent,
    ReactNode,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import {
    Box,
    Checkbox,
    Collapse,
    FormControlLabel,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    Slider,
    Stack,
    Typography,
} from "@mui/material";
import {
    AddRounded,
    BlockRounded,
    CenterFocusStrongRounded,
    CheckRounded,
    DeleteOutlineRounded,
    DownloadRounded,
    ExpandLessRounded,
    ExpandMoreRounded,
    InfoOutlined,
    OpenInFullRounded,
    PersonRounded,
    RemoveRounded,
    RestartAltRounded,
    SyncRounded,
    UploadRounded,
    VerifiedUserOutlined,
    WarningAmberRounded,
} from "@mui/icons-material";
import { Head, router } from "@inertiajs/react";
import PublicHeader from "../../../../components/layouts/PublicHeader";
import StyledButton from "../../../../components/utils/StyledButton";
import SignaturePad from "../../../../components/utils/forms/SignaturePad";
import { toast } from "../../../../helpers/toast";
import {
    BackArt,
    Box as CardBox,
    CARD_HEIGHT,
    CARD_WIDTH,
    centreOf,
    drawBack,
    drawFront,
    formatExpiry,
    FrontArt,
    INK,
    loadImage,
    PHOTO_WINDOW,
    photoBoxFor,
    renderSide,
    signatureBoxFor,
} from "../../../../helpers/lrIdCard";
import FRONT_TEMPLATE from "../../../../../assets/lr-id-front.png";
import BACK_TEMPLATE from "../../../../../assets/lr-id-back.png";

interface LrIdCard {
    id: number;
    // Already in capitals; the middle name comes apart so it can be left off.
    first_name: string;
    middle_name: string | null;
    last_name: string;
    title: string;
    email: string | null;
    // The profile photo from this origin, or null when there is none.
    photo: string | null;
    profile_url: string;
    expires_on: string;
}

interface LrIdProps {
    card: LrIdCard;
}

type Side = "front" | "back";

// The page is styled like every other dashboard page (tokens, pill buttons); the card itself keeps its own ink.
const BLUE = "var(--lr-primary)";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const primarySx = {
    px: 3,
    backgroundColor: BLUE,
    color: "var(--lr-on-primary)",
    ":hover": { backgroundColor: "var(--lr-primary-hover)" },
};
const outlineSx = { color: BLUE, borderColor: "var(--lr-outline)" };
const squareSx = {
    width: 36,
    height: 36,
    borderRadius: 2,
    border: "1px solid var(--lr-border)",
    color: BLUE,
};

const readFile = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });

const save = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

// A collapsible settings section: an uppercase title with the card side, a hint, a status chip and a chevron,
// as on the old generator.
function SettingSection({
    title,
    side,
    hint,
    status,
    open,
    onToggle,
    children,
}: {
    title: string;
    side: string;
    hint: string;
    status: { label: string; done: boolean };
    open: boolean;
    onToggle: () => void;
    children: ReactNode;
}) {
    return (
        <Box
            sx={{
                borderRadius: 4,
                border: "1px solid var(--lr-border)",
                backgroundColor: "var(--lr-surface)",
                overflow: "hidden",
            }}
        >
            <Box
                onClick={onToggle}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    p: 2,
                    cursor: "pointer",
                    backgroundColor: "var(--lr-surface-dim)",
                }}
            >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        sx={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: "var(--lr-text-primary)",
                            textTransform: "uppercase",
                            lineHeight: 1.3,
                        }}
                    >
                        {title}{" "}
                        <Box
                            component="span"
                            sx={{
                                fontSize: 14,
                                fontWeight: 500,
                                textTransform: "none",
                                color: "var(--lr-text-secondary)",
                            }}
                        >
                            ({side})
                        </Box>
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{ color: "var(--lr-text-secondary)" }}
                    >
                        {hint}
                    </Typography>
                </Box>
                <Box
                    component="span"
                    sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.5,
                        px: 1.5,
                        py: 0.6,
                        borderRadius: 999,
                        fontSize: 14,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        color: status.done
                            ? "var(--lr-success)"
                            : "var(--lr-text-secondary)",
                        backgroundColor: status.done
                            ? "var(--lr-success-soft)"
                            : "var(--lr-surface-container)",
                        border: `1px solid ${status.done ? "var(--lr-success)" : "var(--lr-border)"}`,
                    }}
                >
                    {status.done && <CheckRounded sx={{ fontSize: 16 }} />}
                    {status.label}
                </Box>
                <IconButton
                    size="small"
                    aria-label={open ? "Collapse" : "Expand"}
                    sx={{
                        border: "1px solid var(--lr-border)",
                        backgroundColor: "var(--lr-surface)",
                        color: BLUE,
                    }}
                >
                    {open ? (
                        <ExpandLessRounded fontSize="small" />
                    ) : (
                        <ExpandMoreRounded fontSize="small" />
                    )}
                </IconButton>
            </Box>
            <Collapse in={open}>
                <Box sx={{ p: 2, borderTop: "1px solid var(--lr-border)" }}>
                    {children}
                </Box>
            </Collapse>
        </Box>
    );
}

// The two big panels of the old generator: a title, a subtitle and something on the right, over the content.
function Panel({
    title,
    subtitle,
    action,
    children,
}: {
    title: string;
    subtitle: string;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <Box
            component="section"
            sx={{
                p: { xs: 2, sm: 3 },
                border: "1px solid var(--lr-border)",
                borderRadius: 4,
                backgroundColor: "var(--lr-surface)",
                boxShadow:
                    "0 1px 3px rgba(60,64,67,.08), 0 8px 24px rgba(60,64,67,.06)",
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.5,
                    pb: 2.5,
                    mb: 2.5,
                    borderBottom: "1px solid var(--lr-border)",
                }}
            >
                <Box>
                    <Typography
                        sx={{
                            fontSize: 26,
                            fontWeight: 700,
                            color: "var(--lr-text-primary)",
                            lineHeight: 1.2,
                        }}
                    >
                        {title}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: 16,
                            color: "var(--lr-text-secondary)",
                            mt: 0.5,
                        }}
                    >
                        {subtitle}
                    </Typography>
                </Box>
                {action}
            </Box>
            {children}
        </Box>
    );
}

// A small rounded tag, as on the old generator's panel headers.
function Tag({
    children,
    tone,
    small = false,
}: {
    children: ReactNode;
    tone: "red" | "gray" | "blue";
    small?: boolean;
}) {
    const colors = {
        red: {
            color: "var(--lr-error)",
            bg: "var(--lr-error-soft)",
            border: "var(--lr-error)",
        },
        gray: {
            color: "var(--lr-text-primary)",
            bg: "var(--lr-surface-container)",
            border: "transparent",
        },
        blue: {
            color: BLUE,
            bg: "var(--lr-primary-soft)",
            border: "var(--lr-primary-soft-strong)",
        },
    }[tone];
    return (
        <Box
            component="span"
            sx={{
                px: small ? 1 : 1.5,
                py: small ? 0.25 : 0.6,
                borderRadius: small ? 1.5 : 999,
                fontSize: small ? 13 : 14,
                fontWeight: 600,
                whiteSpace: "nowrap",
                color: colors.color,
                backgroundColor: colors.bg,
                border: `1px solid ${colors.border}`,
            }}
        >
            {children}
        </Box>
    );
}

// A soft panel inside a card, for a group of related controls.
const insetSx = {
    p: 2,
    borderRadius: 2,
    border: "1px solid var(--lr-border)",
    backgroundColor: "var(--lr-surface-dim)",
};

// The official terms shown on arrival and confirmed again before every download, as on the old generator.
function TermsDialog({
    open,
    confirming,
    onClose,
    onAgree,
}: {
    open: boolean;
    confirming: boolean;
    onClose: () => void;
    onAgree: () => void;
}) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            slotProps={{
                paper: {
                    sx: { borderRadius: 4, maxWidth: 700, overflow: "hidden" },
                },
            }}
        >
            <DialogTitle sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
                <Stack direction="row" alignItems="flex-start" gap={2}>
                    <Box
                        sx={{
                            width: 56,
                            height: 56,
                            flexShrink: 0,
                            borderRadius: 3,
                            display: "grid",
                            placeItems: "center",
                            color: "var(--lr-error)",
                            backgroundColor: "var(--lr-error-soft)",
                            border: "1px solid var(--lr-error)",
                        }}
                    >
                        <WarningAmberRounded sx={{ fontSize: 26 }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" gap={1} sx={{ mb: 0.75 }}>
                            <Tag tone="blue" small>
                                Official Policy
                            </Tag>
                            {confirming && (
                                <Tag tone="red" small>
                                    Download Confirmation
                                </Tag>
                            )}
                        </Stack>
                        <Typography
                            sx={{
                                fontSize: 22,
                                fontWeight: 700,
                                lineHeight: 1.25,
                                color: "var(--lr-text-primary)",
                            }}
                        >
                            Official Identification Terms & Authorized Purpose
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: 14,
                                color: "var(--lr-text-secondary)",
                                mt: 0.25,
                            }}
                        >
                            Leuterio Realty & Brokerage Inc. • Compliance &
                            Governance Policy
                        </Typography>
                    </Box>
                </Stack>
            </DialogTitle>
            <DialogContent sx={{ px: 3 }}>
                <Stack gap={2}>
                    <Box
                        sx={{
                            p: 2,
                            borderRadius: 3,
                            backgroundColor: "var(--lr-primary-soft)",
                            border: "1px solid var(--lr-primary-soft-strong)",
                        }}
                    >
                        <Stack direction="row" alignItems="center" gap={1}>
                            <VerifiedUserOutlined
                                fontSize="small"
                                sx={{ color: BLUE }}
                            />
                            <Typography
                                sx={{
                                    fontSize: 15,
                                    fontWeight: 700,
                                    color: "var(--lr-text-primary)",
                                }}
                            >
                                Authorized Purpose:
                            </Typography>
                        </Stack>
                        <Typography
                            sx={{
                                fontSize: 14,
                                lineHeight: 1.6,
                                color: "var(--lr-text-body)",
                                mt: 0.5,
                                pl: 3.5,
                            }}
                        >
                            This credential is issued exclusively as{" "}
                            <strong>proof of active identification</strong> as
                            an authorized salesperson / real estate practitioner
                            affiliated with{" "}
                            <strong>Leuterio Realty and Brokerage Inc.</strong>
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            p: 2,
                            borderRadius: 3,
                            backgroundColor: "var(--lr-error-soft)",
                            border: "1px solid var(--lr-error)",
                        }}
                    >
                        <Stack direction="row" alignItems="center" gap={1}>
                            <BlockRounded
                                fontSize="small"
                                sx={{ color: "var(--lr-error)" }}
                            />
                            <Typography
                                sx={{
                                    fontSize: 15,
                                    fontWeight: 700,
                                    color: "var(--lr-error)",
                                }}
                            >
                                Strictly Prohibited Uses:
                            </Typography>
                        </Stack>
                        <Box
                            component="ul"
                            sx={{
                                m: 0,
                                mt: 0.5,
                                pl: 3,
                                color: "var(--lr-text-body)",
                                "& li": {
                                    fontSize: 14,
                                    lineHeight: 1.6,
                                    mt: 0.75,
                                },
                            }}
                        >
                            <li>
                                <strong>NEVER</strong> present, utilize, or
                                submit this ID to lending companies, loan
                                institutions, or financing providers for
                                personal or commercial borrowing.
                            </li>
                            <li>
                                <strong>NEVER</strong> use this ID as loan
                                collateral, security deposit, or guarantee for
                                monetary debt.
                            </li>
                            <li>
                                <strong>NEVER</strong> represent or present this
                                ID for debt collection agencies or debt recovery
                                operations.
                            </li>
                        </Box>
                    </Box>
                    <Typography
                        sx={{
                            fontSize: 13,
                            lineHeight: 1.6,
                            color: "var(--lr-text-secondary)",
                            borderTop: "1px solid var(--lr-border)",
                            pt: 1.5,
                        }}
                    >
                        <strong>Legal Notice:</strong> Any unauthorized use,
                        misrepresentation, or fraudulent presentation of this
                        credential is a direct violation of corporate
                        regulations and applicable Philippine laws, and
                        constitutes grounds for immediate revocation of
                        affiliation, administrative sanctions, and civil or
                        criminal legal prosecution.
                    </Typography>
                </Stack>
            </DialogContent>
            <DialogActions
                sx={{
                    px: 3,
                    py: 2,
                    backgroundColor: "var(--lr-surface-dim)",
                    borderTop: "1px solid var(--lr-border)",
                }}
            >
                {confirming && (
                    <StyledButton
                        onClick={onClose}
                        sx={{ color: "var(--lr-text-secondary)" }}
                    >
                        Cancel
                    </StyledButton>
                )}
                <StyledButton
                    variant="contained"
                    onClick={onAgree}
                    startIcon={
                        confirming ? <DownloadRounded /> : <CheckRounded />
                    }
                    sx={{
                        px: 2.5,
                        py: 1,
                        fontWeight: 700,
                        borderRadius: 3,
                        backgroundColor: "var(--lr-error)",
                        color: "#fff",
                        ":hover": { backgroundColor: "var(--lr-error-strong)" },
                    }}
                >
                    {confirming
                        ? "I Agree & Download ID (Front & Back)"
                        : "I Understand & Acknowledge"}
                </StyledButton>
            </DialogActions>
        </Dialog>
    );
}

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.05;
const NUDGE = 10;
// The photo editors' view: the part of the card around the photo window, with room for the photo's corners.
const WINDOW_SIZE = 640;
const WINDOW_VIEW: CardBox = {
    x: PHOTO_WINDOW.cx - WINDOW_SIZE / 2,
    y: PHOTO_WINDOW.cy - WINDOW_SIZE / 2,
    w: WINDOW_SIZE,
    h: WINDOW_SIZE,
};
const clampZoom = (value: number) =>
    Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 100) / 100));

interface CardCanvasProps {
    paint: (ctx: CanvasRenderingContext2D) => void;
    label: string;
    // What a drag moves (the photo on the front, the signature on the back); null when there is nothing.
    target: CardBox | null;
    selected: boolean;
    onSelect: (selected: boolean) => void;
    onMove: (box: CardBox) => void;
    // A pinch on a touch screen: the factor to multiply the zoom by.
    onPinch?: (factor: number) => void;
    // Only this part of the card (card pixels), e.g. the photo window; the whole card by default.
    viewport?: CardBox;
    // A photo editor: a drag anywhere moves the photo (the window view is mostly photo).
    dragAnywhere?: boolean;
    // Where the photo shows through, outlined while the photo is selected so the face is easy to place.
    guide?: { cx: number; cy: number; rx: number; ry: number };
    onCentre?: () => void;
    // Pulling a corner handle of the selected photo / signature resizes it (same proportions, opposite corner fixed).
    onResize?: (box: CardBox) => void;
}

const CORNERS = [
    { cx: 0, cy: 0, cursor: "nwse-resize" },
    { cx: 1, cy: 0, cursor: "nesw-resize" },
    { cx: 0, cy: 1, cursor: "nesw-resize" },
    { cx: 1, cy: 1, cursor: "nwse-resize" },
] as const;

// The 1050 × 1650 card, scaled to its box, with the old generator's editing on top: tap the photo to select it
// (a dotted outline with corner handles), drag it about, pinch to zoom, tap elsewhere to deselect.
function CardCanvas({
    paint,
    label,
    target,
    selected,
    onSelect,
    onMove,
    onPinch,
    viewport,
    dragAnywhere = false,
    guide,
    onCentre,
    onResize,
}: CardCanvasProps) {
    const view = viewport ?? { x: 0, y: 0, w: CARD_WIDTH, h: CARD_HEIGHT };
    const ref = useRef<HTMLCanvasElement>(null);
    const pointers = useRef(new Map<number, { x: number; y: number }>());
    const drag = useRef<{ x: number; y: number; box: CardBox } | null>(null);
    const pinch = useRef<number | null>(null);
    const resize = useRef<{
        anchor: { x: number; y: number };
        start: { x: number; y: number };
        box: CardBox;
        dirX: 1 | -1;
        dirY: 1 | -1;
    } | null>(null);
    const [dragging, setDragging] = useState(false);

    // Mouse wheel / trackpad zoom, once the photo is selected (so the page still scrolls over an idle card).
    // React registers wheel listeners as passive, so the page scroll can only be stopped from a native one.
    const zoomable = Boolean(target && onPinch && selected);
    useEffect(() => {
        const canvas = ref.current;
        if (!canvas || !zoomable) return;
        const wheel = (e: WheelEvent) => {
            e.preventDefault();
            onPinch?.(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
        };
        canvas.addEventListener("wheel", wheel, { passive: false });
        return () => canvas.removeEventListener("wheel", wheel);
    }, [zoomable, onPinch]);

    useEffect(() => {
        const ctx = ref.current?.getContext("2d");
        if (!ctx) return;
        ctx.save();
        ctx.translate(-view.x, -view.y);
        paint(ctx);
        ctx.restore();
    }, [paint, view.x, view.y]);

    const pointAt = (clientX: number, clientY: number) => {
        const rect = ref.current!.getBoundingClientRect();
        return {
            x: view.x + ((clientX - rect.left) * view.w) / rect.width,
            y: view.y + ((clientY - rect.top) * view.h) / rect.height,
        };
    };
    const cardPoint = (e: PointerEvent<HTMLCanvasElement>) =>
        pointAt(e.clientX, e.clientY);

    const startResize = (
        e: PointerEvent<HTMLDivElement>,
        cx: 0 | 1,
        cy: 0 | 1,
    ) => {
        if (!target) return;
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        resize.current = {
            anchor: {
                x: target.x + (1 - cx) * target.w,
                y: target.y + (1 - cy) * target.h,
            },
            start: pointAt(e.clientX, e.clientY),
            box: target,
            dirX: cx ? 1 : -1,
            dirY: cy ? 1 : -1,
        };
        setDragging(true);
    };
    const moveResize = (e: PointerEvent<HTMLDivElement>) => {
        const r = resize.current;
        if (!r || !onResize) return;
        // By how far the pointer has travelled, so a handle shown pulled inside the view still works.
        const p = pointAt(e.clientX, e.clientY);
        const k = Math.max(
            0.05,
            1 +
                Math.max(
                    ((p.x - r.start.x) * r.dirX) / r.box.w,
                    ((p.y - r.start.y) * r.dirY) / r.box.h,
                ),
        );
        const w = r.box.w * k;
        const h = r.box.h * k;
        onResize({
            x: r.dirX > 0 ? r.anchor.x : r.anchor.x - w,
            y: r.dirY > 0 ? r.anchor.y : r.anchor.y - h,
            w,
            h,
        });
    };
    const endResize = () => {
        resize.current = null;
        setDragging(false);
    };
    const distance = () => {
        const [a, b] = [...pointers.current.values()];
        return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const inside = (p: { x: number; y: number }, box: CardBox) =>
        p.x >= box.x &&
        p.x <= box.x + box.w &&
        p.y >= box.y &&
        p.y <= box.y + box.h;

    const down = (e: PointerEvent<HTMLCanvasElement>) => {
        const p = cardPoint(e);
        pointers.current.set(e.pointerId, p);
        e.currentTarget.setPointerCapture(e.pointerId);
        if (pointers.current.size === 2 && target) {
            drag.current = null;
            pinch.current = distance();
            return;
        }
        if (!target) return;
        const hit = dragAnywhere || inside(p, target);
        onSelect(hit);
        drag.current = hit ? { ...p, box: target } : null;
        setDragging(hit);
    };
    const move = (e: PointerEvent<HTMLCanvasElement>) => {
        if (!pointers.current.has(e.pointerId)) return;
        pointers.current.set(e.pointerId, cardPoint(e));
        if (pinch.current !== null && pointers.current.size === 2) {
            const next = distance();
            if (pinch.current > 0 && onPinch) onPinch(next / pinch.current);
            pinch.current = next;
            return;
        }
        if (!drag.current) return;
        const p = cardPoint(e);
        onMove({
            ...drag.current.box,
            x: drag.current.box.x + p.x - drag.current.x,
            y: drag.current.box.y + p.y - drag.current.y,
        });
    };
    const up = (e: PointerEvent<HTMLCanvasElement>) => {
        pointers.current.delete(e.pointerId);
        if (pointers.current.size < 2) pinch.current = null;
        if (pointers.current.size === 0) {
            drag.current = null;
            setDragging(false);
        }
    };

    // Positions inside the view, as percentages; handles are kept just inside the edge so they can always be grabbed.
    const px = (x: number) => `${((x - view.x) / view.w) * 100}%`;
    const py = (y: number) => `${((y - view.y) / view.h) * 100}%`;
    const clamp = (value: number) => Math.min(97, Math.max(3, value));
    const hx = (x: number) => `${clamp(((x - view.x) / view.w) * 100)}%`;
    const hy = (y: number) => `${clamp(((y - view.y) / view.h) * 100)}%`;
    return (
        <Box
            sx={{
                position: "relative",
                borderRadius: 3,
                overflow: "hidden",
                boxShadow: viewport ? "none" : "0 8px 24px rgba(0,0,0,.14)",
                border: viewport ? "1px solid var(--lr-border)" : "none",
                backgroundColor: "#fff",
                lineHeight: 0,
            }}
        >
            {/* A plain element: MUI's Box would turn width / height into CSS and leave the canvas at the
                browser's 300 × 150 default. */}
            <canvas
                ref={ref}
                width={view.w}
                height={view.h}
                aria-label={label}
                onPointerDown={down}
                onPointerMove={move}
                onPointerUp={up}
                onPointerCancel={up}
                onDoubleClick={target ? onCentre : undefined}
                style={{
                    display: "block",
                    width: "100%",
                    height: "auto",
                    touchAction: "none",
                    cursor: target
                        ? dragging
                            ? "grabbing"
                            : "grab"
                        : "default",
                }}
            />
            {target && selected && (
                <>
                    {guide && (
                        <Box
                            sx={{
                                position: "absolute",
                                left: px(guide.cx - guide.rx),
                                top: py(guide.cy - guide.ry),
                                width: `${((guide.rx * 2) / view.w) * 100}%`,
                                height: `${((guide.ry * 2) / view.h) * 100}%`,
                                borderRadius: "50%",
                                border: "2px dashed rgba(0,59,100,.55)",
                                boxShadow: "0 0 0 9999px rgba(0,59,100,.08)",
                                pointerEvents: "none",
                            }}
                        />
                    )}
                    <Box
                        sx={{
                            position: "absolute",
                            left: px(target.x),
                            top: py(target.y),
                            width: `${(target.w / view.w) * 100}%`,
                            height: `${(target.h / view.h) * 100}%`,
                            border: "1px dashed var(--lr-primary)",
                            pointerEvents: "none",
                        }}
                    />
                    {onResize &&
                        CORNERS.map(({ cx, cy, cursor }) => (
                            <Box
                                key={`${cx}${cy}`}
                                role="slider"
                                aria-label="Resize"
                                onPointerDown={(e) => startResize(e, cx, cy)}
                                onPointerMove={moveResize}
                                onPointerUp={endResize}
                                onPointerCancel={endResize}
                                sx={{
                                    position: "absolute",
                                    left: hx(target.x + cx * target.w),
                                    top: hy(target.y + cy * target.h),
                                    width: 22,
                                    height: 22,
                                    transform: "translate(-50%, -50%)",
                                    borderRadius: "50%",
                                    backgroundColor: "#fff",
                                    border: `3px solid ${BLUE}`,
                                    boxShadow: "0 1px 4px rgba(0,0,0,.35)",
                                    cursor,
                                    touchAction: "none",
                                    zIndex: 1,
                                }}
                            />
                        ))}
                </>
            )}
        </Box>
    );
}

function LrId({ card }: LrIdProps) {
    const [templates, setTemplates] = useState<{
        front: HTMLImageElement;
        back: HTMLImageElement;
    } | null>(null);
    const [side, setSide] = useState<Side>("front");

    const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
    const [photoName, setPhotoName] = useState<string | null>(null);
    const [photoBox, setPhotoBox] = useState<CardBox>({
        x: 0,
        y: 0,
        w: 0,
        h: 0,
    });
    const [zoom, setZoom] = useState(1);
    const [photoExpanded, setPhotoExpanded] = useState(false);
    const photoInput = useRef<HTMLInputElement>(null);
    const [photoOpen, setPhotoOpen] = useState(true);
    const [signatureOpen, setSignatureOpen] = useState(true);
    const signatureInput = useRef<HTMLInputElement>(null);
    // The photo (front) or signature (back) tapped on the preview, showing its outline and the drag hint.
    const [selected, setSelected] = useState(false);

    const [signatureMode, setSignatureMode] = useState<"upload" | "draw">(
        "upload",
    );
    const [signatureName, setSignatureName] = useState<string | null>(null);
    // What is on the pad right now; it goes on the card only when applied.
    const [drawn, setDrawn] = useState<string | null>(null);
    const [padKey, setPadKey] = useState(0);
    const [padExpanded, setPadExpanded] = useState(false);
    const [signature, setSignature] = useState<HTMLImageElement | null>(null);
    const [signatureScale, setSignatureScale] = useState(1);
    const [signatureBox, setSignatureBox] = useState<CardBox>(
        signatureBoxFor(1),
    );

    const [terms, setTerms] = useState<"acknowledge" | "download" | null>(
        "acknowledge",
    );
    const [busy, setBusy] = useState<"idle" | "front" | "back" | "done">(
        "idle",
    );

    const idNo = String(card.id);
    const expiry = formatExpiry(card.expires_on);
    const [withMiddle, setWithMiddle] = useState(true);
    const cardName = [
        card.first_name,
        withMiddle ? card.middle_name : null,
        card.last_name,
    ]
        .filter(Boolean)
        .join(" ");

    useEffect(() => setSelected(false), [side]);

    useEffect(() => {
        let cancelled = false;
        Promise.all([loadImage(FRONT_TEMPLATE), loadImage(BACK_TEMPLATE)]).then(
            ([front, back]) => {
                if (!cancelled) setTemplates({ front, back });
            },
        );
        if (card.photo) {
            loadImage(card.photo)
                .then((image) => {
                    if (cancelled) return;
                    setPhoto(image);
                    setPhotoName("Profile photo");
                    setPhotoBox(photoBoxFor(image, 1));
                })
                .catch(() =>
                    toast.error(
                        "Your profile photo couldn't be loaded; upload one for the card.",
                    ),
                );
        }
        return () => {
            cancelled = true;
        };
    }, [card.photo]);

    const frontArt = (): FrontArt | null =>
        templates
            ? {
                  template: templates.front,
                  photo,
                  photoBox,
                  name: cardName,
                  idNo,
                  qrValue: card.profile_url,
              }
            : null;
    const backArt = (): BackArt | null =>
        templates
            ? { template: templates.back, signature, signatureBox, expiry }
            : null;

    // Paints the side being shown; every preview canvas redraws when anything on the card changes.
    const paint = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (!templates) return;
            if (side === "front")
                drawFront(ctx, {
                    template: templates.front,
                    photo,
                    photoBox,
                    name: cardName,
                    idNo,
                    qrValue: card.profile_url,
                });
            else
                drawBack(ctx, {
                    template: templates.back,
                    signature,
                    signatureBox,
                    expiry,
                });
        },
        [
            templates,
            side,
            photo,
            photoBox,
            signature,
            signatureBox,
            cardName,
            card.profile_url,
            idNo,
            expiry,
        ],
    );

    const usePhoto = async (src: string, name: string) => {
        try {
            const image = await loadImage(src);
            setPhoto(image);
            setPhotoName(name);
            setZoom(1);
            setPhotoBox(photoBoxFor(image, 1));
            setSide("front");
        } catch {
            toast.error("That file isn't an image the card can use.");
        }
    };
    const uploadPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file) await usePhoto(await readFile(file), file.name);
    };
    // Zooming keeps whatever is in the window where it is (scales about the window's centre), so the face
    // framed at one size stays framed at the next.
    const zoomPhoto = (value: number) => {
        const next = clampZoom(value);
        if (next === zoom) return;
        setZoom(next);
        const k = next / zoom;
        setPhotoBox((box) => ({
            x: PHOTO_WINDOW.cx - (PHOTO_WINDOW.cx - box.x) * k,
            y: PHOTO_WINDOW.cy - (PHOTO_WINDOW.cy - box.y) * k,
            w: box.w * k,
            h: box.h * k,
        }));
    };
    // A drag that lands within a few pixels of the window's centre snaps onto it.
    const placePhoto = (box: CardBox) => {
        const c = centreOf(box);
        const snap =
            Math.abs(c.x - PHOTO_WINDOW.cx) < 8 &&
            Math.abs(c.y - PHOTO_WINDOW.cy) < 8;
        setPhotoBox(
            snap
                ? {
                      ...box,
                      x: PHOTO_WINDOW.cx - box.w / 2,
                      y: PHOTO_WINDOW.cy - box.h / 2,
                  }
                : box,
        );
    };
    const centrePhoto = () => {
        if (photo) setPhotoBox(photoBoxFor(photo, zoom));
    };
    const resetPhoto = () => {
        if (!photo) return;
        setZoom(1);
        setPhotoBox(photoBoxFor(photo, 1));
    };
    // A corner pulled on a preview: the box is the new size, the zoom / scale follows it.
    const resizePhoto = (box: CardBox) => {
        if (!photo) return;
        const next = box.w / photoBoxFor(photo, 1).w;
        if (next < ZOOM_MIN || next > ZOOM_MAX) return;
        setZoom(Math.round(next * 100) / 100);
        setPhotoBox(box);
    };
    const resizeTarget = (box: CardBox) => {
        if (side === "front") resizePhoto(box);
        else {
            const next = box.w / signatureBoxFor(1).w;
            if (next < 0.4 || next > 2) return;
            setSignatureScale(next);
            setSignatureBox(box);
        }
    };
    const nudgePhoto = (dx: number, dy: number) =>
        setPhotoBox((box) => ({ ...box, x: box.x + dx, y: box.y + dy }));
    const removePhoto = () => {
        setPhoto(null);
        setPhotoName(null);
        setSelected(false);
    };

    const applySignature = async (src: string | null, name: string | null) => {
        if (!src) {
            setSignature(null);
            setSignatureName(null);
            return;
        }
        try {
            setSignature(await loadImage(src));
            setSignatureName(name);
            setSide("back");
        } catch {
            toast.error("That file isn't an image the card can use.");
        }
    };
    const uploadSignature = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file) await applySignature(await readFile(file), file.name);
    };
    const clearPad = () => {
        setDrawn(null);
        setPadKey((k) => k + 1);
    };
    const scaleSignature = (value: number) => {
        setSignatureScale(value);
        setSignatureBox(signatureBoxFor(value, centreOf(signatureBox)));
    };
    const resetSignature = () => {
        setSignatureScale(1);
        setSignatureBox(signatureBoxFor(1));
    };

    // The preview canvases (the panel and the expanded editor) share the same editing wiring.
    const dragTarget =
        side === "front"
            ? photo
                ? photoBox
                : null
            : signature
              ? signatureBox
              : null;
    const moveTarget = (box: CardBox) =>
        side === "front" ? placePhoto(box) : setSignatureBox(box);

    // With the photo selected the keyboard works too: arrows nudge (Shift: ×5), + / − zoom, Esc deselects.
    const photoKeys = selected && side === "front" && Boolean(photo);
    useEffect(() => {
        if (!photoKeys) return;
        const onKey = (e: KeyboardEvent) => {
            const el = e.target as HTMLElement | null;
            if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
            const step = e.shiftKey ? NUDGE * 5 : NUDGE;
            const moves: Record<string, [number, number]> = {
                ArrowUp: [0, -step],
                ArrowDown: [0, step],
                ArrowLeft: [-step, 0],
                ArrowRight: [step, 0],
            };
            if (moves[e.key]) {
                e.preventDefault();
                nudgePhoto(...moves[e.key]);
            } else if (e.key === "+" || e.key === "=")
                zoomPhoto(zoom + ZOOM_STEP);
            else if (e.key === "-" || e.key === "_")
                zoomPhoto(zoom - ZOOM_STEP);
            else if (e.key === "Escape") setSelected(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });
    const previewCanvas = (
        <CardCanvas
            paint={paint}
            label={`${side === "front" ? "Front" : "Back"} of your LR ID`}
            target={dragTarget}
            selected={selected}
            onSelect={setSelected}
            onMove={moveTarget}
            onPinch={
                side === "front"
                    ? (factor) => zoomPhoto(zoom * factor)
                    : undefined
            }
            onResize={resizeTarget}
            guide={side === "front" ? PHOTO_WINDOW : undefined}
            onCentre={side === "front" ? centrePhoto : resetSignature}
        />
    );
    // The card around the photo window, with the same outline and corner handles as the big preview: in the
    // settings panel and, larger, in the expanded editor.
    const windowCanvas = (
        <CardCanvas
            paint={paint}
            label="Your photo inside the ID's window"
            target={photo ? photoBox : null}
            selected
            onSelect={() => {}}
            onMove={placePhoto}
            onPinch={(factor) => zoomPhoto(zoom * factor)}
            onResize={resizePhoto}
            onCentre={centrePhoto}
            viewport={WINDOW_VIEW}
            dragAnywhere
        />
    );
    const logDownload = () =>
        router.post(
            "/dashboard/lr-id/downloaded",
            {},
            { preserveState: true, preserveScroll: true },
        );

    const download = async () => {
        const front = frontArt();
        const back = backArt();
        if (!front || !back) return;
        try {
            setBusy("front");
            save(
                await renderSide("front", front),
                `Leuterio-Realty-ID-${idNo}-Front.png`,
            );
            // Browsers drop a second download fired in the same instant.
            await new Promise((r) => setTimeout(r, 600));
            setBusy("back");
            save(
                await renderSide("back", back),
                `Leuterio-Realty-ID-${idNo}-Back.png`,
            );
            logDownload();
            setBusy("done");
            setTimeout(() => setBusy("idle"), 3500);
        } catch (error) {
            console.error("LR ID export failed", error);
            setBusy("idle");
            toast.error("Couldn't generate the ID. Please try again.");
        }
    };

    const flip = () => setSide(side === "front" ? "back" : "front");
    const flipLabel = `Flip to ${side === "front" ? "Back" : "Front"} Side`;
    const downloadLabel = {
        idle: "Download Official ID (Front & Back)",
        front: "Downloading Front Side...",
        back: "Downloading Back Side...",
        done: "Downloaded Both Sides!",
    }[busy];
    // Every download is confirmed against the terms first, as on the old generator.
    const requestDownload = () => setTerms("download");

    const pad = (height?: number) => (
        <SignaturePad
            key={padKey}
            onChange={setDrawn}
            ink={INK}
            showFooter={false}
            height={height}
        />
    );

    const zoomRow = (
        <Stack direction="row" alignItems="center" gap={0.5}>
            <IconButton
                aria-label="Zoom out"
                onClick={() => zoomPhoto(zoom - ZOOM_STEP)}
                sx={squareSx}
            >
                <RemoveRounded fontSize="small" />
            </IconButton>
            <Typography
                sx={{
                    minWidth: 48,
                    textAlign: "center",
                    fontSize: 14,
                    color: "var(--lr-text-primary)",
                    fontFamily: MONO,
                }}
            >
                {Math.round(zoom * 100)}%
            </Typography>
            <IconButton
                aria-label="Zoom in"
                onClick={() => zoomPhoto(zoom + ZOOM_STEP)}
                sx={squareSx}
            >
                <AddRounded fontSize="small" />
            </IconButton>
        </Stack>
    );

    const openPhotoEditor = () => {
        setSide("front");
        setSelected(true);
        setPhotoExpanded(true);
    };

    return (
        // Like the business profile: outside AppLayout, just the public header over the content, scrolling on its own.
        <Box
            sx={{
                height: "100vh",
                "@supports (height: 100dvh)": { height: "100dvh" },
                overflowY: "auto",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                backgroundColor: "var(--lr-surface-dim)",
            }}
        >
            <Head title="Generate LR ID" />
            <PublicHeader />
            <Container maxWidth="xl" sx={{ py: { xs: 3, sm: 4 }, flex: 1 }}>
                <Grid
                    container
                    spacing={{ xs: 2, lg: 3 }}
                    alignItems="flex-start"
                >
                    <Grid size={12}>
                        <Panel
                            title="ID Preview"
                            subtitle="Live preview of your official Leuterio Realty ID card"
                            action={
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    gap={1}
                                >
                                    <StyledButton
                                        startIcon={<SyncRounded />}
                                        onClick={flip}
                                        sx={{
                                            px: 2,
                                            fontWeight: 700,
                                            color: BLUE,
                                            backgroundColor:
                                                "var(--lr-primary-soft)",
                                            border: "1px solid var(--lr-primary-soft-strong)",
                                            ":hover": {
                                                backgroundColor:
                                                    "var(--lr-primary-soft-hover)",
                                            },
                                        }}
                                    >
                                        {flipLabel}
                                    </StyledButton>
                                    <Tag tone="gray">CR80 Format</Tag>
                                </Stack>
                            }
                        >
                            <Grid
                                container
                                spacing={{ xs: 2.5, lg: 4 }}
                                alignItems="flex-start"
                            >
                                <Grid
                                    size={{ xs: 12, md: 6, lg: 5 }}
                                    order={{ xs: 2, md: 1 }}
                                >
                                    <Stack gap={2}>
                                        <Box sx={insetSx}>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: "var(--lr-text-secondary)",
                                                }}
                                            >
                                                Name on the card
                                            </Typography>
                                            <Typography
                                                sx={{
                                                    fontSize: 18,
                                                    fontWeight: 700,
                                                    color: "var(--lr-text-primary)",
                                                    wordBreak: "break-word",
                                                }}
                                            >
                                                {cardName}
                                            </Typography>
                                            {card.middle_name && (
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            checked={withMiddle}
                                                            onChange={(e) =>
                                                                setWithMiddle(
                                                                    e.target
                                                                        .checked,
                                                                )
                                                            }
                                                            sx={{
                                                                color: BLUE,
                                                                "&.Mui-checked":
                                                                    {
                                                                        color: BLUE,
                                                                    },
                                                            }}
                                                        />
                                                    }
                                                    label={
                                                        <Typography variant="body2">
                                                            Include my middle
                                                            name
                                                        </Typography>
                                                    }
                                                    sx={{ mt: 0.5, ml: -1 }}
                                                />
                                            )}
                                        </Box>
                                        <SettingSection
                                            title="Profile Photo"
                                            side="Front Side"
                                            hint="Tap to edit photo position & zoom"
                                            status={
                                                photo
                                                    ? {
                                                          label: "Added",
                                                          done: true,
                                                      }
                                                    : {
                                                          label: "Required",
                                                          done: false,
                                                      }
                                            }
                                            open={photoOpen}
                                            onToggle={() =>
                                                setPhotoOpen((v) => !v)
                                            }
                                        >
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    gap: 1,
                                                }}
                                            >
                                                <StyledButton
                                                    variant="contained"
                                                    startIcon={
                                                        <PersonRounded />
                                                    }
                                                    disabled={!card.photo}
                                                    onClick={() =>
                                                        usePhoto(
                                                            card.photo!,
                                                            "Profile photo",
                                                        )
                                                    }
                                                    sx={primarySx}
                                                >
                                                    Use my profile
                                                </StyledButton>
                                                <StyledButton
                                                    variant="outlined"
                                                    startIcon={
                                                        <UploadRounded />
                                                    }
                                                    onClick={() =>
                                                        photoInput.current?.click()
                                                    }
                                                    sx={outlineSx}
                                                >
                                                    Upload photo
                                                </StyledButton>
                                                <input
                                                    ref={photoInput}
                                                    type="file"
                                                    accept="image/*"
                                                    hidden
                                                    onChange={uploadPhoto}
                                                />
                                                {photo && (
                                                    <StyledButton
                                                        variant="outlined"
                                                        startIcon={
                                                            <DeleteOutlineRounded />
                                                        }
                                                        onClick={removePhoto}
                                                        sx={{
                                                            color: "var(--lr-error)",
                                                            borderColor:
                                                                "var(--lr-outline)",
                                                        }}
                                                    >
                                                        Remove
                                                    </StyledButton>
                                                )}
                                            </Box>
                                            {!card.photo && !photo && (
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        display: "block",
                                                        mt: 1,
                                                        color: "var(--lr-text-secondary)",
                                                    }}
                                                >
                                                    No profile photo on your
                                                    account yet. Upload one for
                                                    the card.
                                                </Typography>
                                            )}

                                            {photo && (
                                                <Box sx={{ ...insetSx, mt: 2 }}>
                                                    <Stack
                                                        direction="row"
                                                        alignItems="center"
                                                        gap={2}
                                                    >
                                                        <Box
                                                            sx={{
                                                                width: 96,
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            {windowCanvas}
                                                        </Box>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                color: "var(--lr-text-secondary)",
                                                            }}
                                                        >
                                                            Drag the photo to
                                                            move it and pull a
                                                            corner to resize it,
                                                            here or on the ID
                                                            card.
                                                        </Typography>
                                                    </Stack>
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            flexWrap: "wrap",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "space-between",
                                                            gap: 1,
                                                            mt: 1.5,
                                                        }}
                                                    >
                                                        {zoomRow}
                                                        <Stack
                                                            direction="row"
                                                            gap={0.5}
                                                        >
                                                            <StyledButton
                                                                size="small"
                                                                variant="text"
                                                                startIcon={
                                                                    <CenterFocusStrongRounded />
                                                                }
                                                                onClick={
                                                                    centrePhoto
                                                                }
                                                                sx={{
                                                                    color: BLUE,
                                                                }}
                                                            >
                                                                Center
                                                            </StyledButton>
                                                            <StyledButton
                                                                size="small"
                                                                variant="text"
                                                                startIcon={
                                                                    <RestartAltRounded />
                                                                }
                                                                onClick={
                                                                    resetPhoto
                                                                }
                                                                sx={{
                                                                    color: BLUE,
                                                                }}
                                                            >
                                                                Reset
                                                            </StyledButton>
                                                            <StyledButton
                                                                size="small"
                                                                variant="text"
                                                                startIcon={
                                                                    <OpenInFullRounded />
                                                                }
                                                                onClick={
                                                                    openPhotoEditor
                                                                }
                                                                sx={{
                                                                    color: BLUE,
                                                                }}
                                                            >
                                                                Expand
                                                            </StyledButton>
                                                        </Stack>
                                                    </Box>
                                                </Box>
                                            )}
                                        </SettingSection>

                                        <SettingSection
                                            title="Cardholder Signature"
                                            side="Back Side"
                                            hint="Tap to draw or upload your signature"
                                            status={
                                                signature
                                                    ? {
                                                          label: "Added",
                                                          done: true,
                                                      }
                                                    : {
                                                          label: "Optional",
                                                          done: false,
                                                      }
                                            }
                                            open={signatureOpen}
                                            onToggle={() =>
                                                setSignatureOpen((v) => !v)
                                            }
                                        >
                                            <Stack direction="row" gap={1}>
                                                {(
                                                    ["draw", "upload"] as const
                                                ).map((mode) => (
                                                    <StyledButton
                                                        key={mode}
                                                        size="small"
                                                        onClick={() =>
                                                            setSignatureMode(
                                                                mode,
                                                            )
                                                        }
                                                        sx={{
                                                            px: 2,
                                                            color: BLUE,
                                                            backgroundColor:
                                                                signatureMode ===
                                                                mode
                                                                    ? "var(--lr-primary-soft)"
                                                                    : "transparent",
                                                        }}
                                                    >
                                                        {mode === "draw"
                                                            ? "Draw"
                                                            : "Upload"}
                                                    </StyledButton>
                                                ))}
                                            </Stack>

                                            {signatureMode === "upload" ? (
                                                <Box sx={{ mt: 2 }}>
                                                    <StyledButton
                                                        variant="outlined"
                                                        startIcon={
                                                            <UploadRounded />
                                                        }
                                                        onClick={() =>
                                                            signatureInput.current?.click()
                                                        }
                                                        sx={outlineSx}
                                                    >
                                                        Upload signature
                                                    </StyledButton>
                                                    <input
                                                        ref={signatureInput}
                                                        type="file"
                                                        accept="image/*"
                                                        hidden
                                                        onChange={
                                                            uploadSignature
                                                        }
                                                    />
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            color: "var(--lr-text-secondary)",
                                                            mt: 1,
                                                            display: "block",
                                                        }}
                                                    >
                                                        {signatureName
                                                            ? `Using ${signatureName}`
                                                            : "A transparent PNG looks best on the card."}
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <Box sx={{ ...insetSx, mt: 2 }}>
                                                    {pad()}
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            flexWrap: "wrap",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "space-between",
                                                            gap: 1,
                                                            mt: 1.5,
                                                        }}
                                                    >
                                                        <Stack
                                                            direction="row"
                                                            gap={0.5}
                                                        >
                                                            <StyledButton
                                                                size="small"
                                                                variant="text"
                                                                startIcon={
                                                                    <RestartAltRounded />
                                                                }
                                                                onClick={
                                                                    clearPad
                                                                }
                                                                sx={{
                                                                    color: BLUE,
                                                                }}
                                                            >
                                                                Clear
                                                            </StyledButton>
                                                            <StyledButton
                                                                size="small"
                                                                variant="text"
                                                                startIcon={
                                                                    <OpenInFullRounded />
                                                                }
                                                                onClick={() =>
                                                                    setPadExpanded(
                                                                        true,
                                                                    )
                                                                }
                                                                sx={{
                                                                    color: BLUE,
                                                                }}
                                                            >
                                                                Larger pad
                                                            </StyledButton>
                                                        </Stack>
                                                        <StyledButton
                                                            size="small"
                                                            variant="contained"
                                                            disabled={!drawn}
                                                            onClick={() =>
                                                                applySignature(
                                                                    drawn,
                                                                    "Drawn signature",
                                                                )
                                                            }
                                                            sx={primarySx}
                                                        >
                                                            Apply to card
                                                        </StyledButton>
                                                    </Box>
                                                </Box>
                                            )}

                                            {signature && (
                                                <Box sx={{ ...insetSx, mt: 2 }}>
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "space-between",
                                                            gap: 1,
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                fontWeight: 500,
                                                                color: "var(--lr-success)",
                                                            }}
                                                        >
                                                            On the back of the
                                                            card
                                                        </Typography>
                                                        <StyledButton
                                                            size="small"
                                                            variant="text"
                                                            startIcon={
                                                                <DeleteOutlineRounded />
                                                            }
                                                            onClick={() =>
                                                                applySignature(
                                                                    null,
                                                                    null,
                                                                )
                                                            }
                                                            sx={{
                                                                color: "var(--lr-error)",
                                                            }}
                                                        >
                                                            Remove
                                                        </StyledButton>
                                                    </Box>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            color: "var(--lr-text-secondary)",
                                                        }}
                                                    >
                                                        Size
                                                    </Typography>
                                                    <Slider
                                                        min={0.4}
                                                        max={2}
                                                        step={0.05}
                                                        value={signatureScale}
                                                        onChange={(_, v) =>
                                                            scaleSignature(
                                                                v as number,
                                                            )
                                                        }
                                                        aria-label="Signature size"
                                                        sx={{
                                                            color: BLUE,
                                                            py: 1,
                                                        }}
                                                    />
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "space-between",
                                                            gap: 1,
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                color: "var(--lr-text-secondary)",
                                                            }}
                                                        >
                                                            Drag it on the back
                                                            of the card to sit
                                                            on the line.
                                                        </Typography>
                                                        <StyledButton
                                                            size="small"
                                                            variant="text"
                                                            startIcon={
                                                                <RestartAltRounded />
                                                            }
                                                            onClick={
                                                                resetSignature
                                                            }
                                                            sx={{
                                                                color: BLUE,
                                                                whiteSpace:
                                                                    "nowrap",
                                                            }}
                                                        >
                                                            Reset
                                                        </StyledButton>
                                                    </Box>
                                                </Box>
                                            )}
                                        </SettingSection>
                                    </Stack>
                                </Grid>
                                <Grid
                                    size={{ xs: 12, md: 6, lg: 7 }}
                                    order={{ xs: 1, md: 2 }}
                                    sx={{
                                        position: { md: "sticky" },
                                        top: { md: 16 },
                                    }}
                                >
                                    <Stack alignItems="center" gap={2.5}>
                                        <Box
                                            sx={{
                                                width: "100%",
                                                maxWidth: 380,
                                            }}
                                        >
                                            {previewCanvas}
                                        </Box>
                                        <Stack
                                            gap={1.5}
                                            sx={{
                                                width: "100%",
                                                maxWidth: 380,
                                            }}
                                        >
                                            <StyledButton
                                                variant="contained"
                                                size="large"
                                                fullWidth
                                                startIcon={
                                                    busy === "done" ? (
                                                        <CheckRounded />
                                                    ) : (
                                                        <DownloadRounded />
                                                    )
                                                }
                                                disabled={
                                                    !templates ||
                                                    busy !== "idle"
                                                }
                                                onClick={requestDownload}
                                                sx={{
                                                    ...primarySx,
                                                    py: 1.5,
                                                    fontSize: 17,
                                                    fontWeight: 700,
                                                    borderRadius: 3,
                                                }}
                                            >
                                                {downloadLabel}
                                            </StyledButton>
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent:
                                                        "space-between",
                                                    gap: 1,
                                                }}
                                            >
                                                <StyledButton
                                                    variant="outlined"
                                                    startIcon={<SyncRounded />}
                                                    onClick={flip}
                                                    sx={{
                                                        ...outlineSx,
                                                        fontWeight: 700,
                                                        borderRadius: 3,
                                                    }}
                                                >
                                                    {flipLabel}
                                                </StyledButton>
                                                <StyledButton
                                                    size="small"
                                                    variant="text"
                                                    startIcon={
                                                        <InfoOutlined
                                                            sx={{
                                                                fontSize:
                                                                    "16px !important",
                                                            }}
                                                        />
                                                    }
                                                    onClick={() =>
                                                        setTerms("acknowledge")
                                                    }
                                                    sx={{
                                                        color: "var(--lr-text-secondary)",
                                                        textDecoration:
                                                            "underline",
                                                        textUnderlineOffset: 3,
                                                        ":hover": {
                                                            textDecoration:
                                                                "underline",
                                                        },
                                                    }}
                                                >
                                                    Policy & Terms
                                                </StyledButton>
                                            </Box>
                                        </Stack>
                                    </Stack>
                                </Grid>
                            </Grid>
                        </Panel>
                    </Grid>
                </Grid>

                {/* A larger pad for fingers; what is drawn here replaces the small pad's drawing when applied. */}
                <Dialog
                    open={padExpanded}
                    onClose={() => setPadExpanded(false)}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle sx={{ fontSize: 18 }}>
                        Draw your signature
                        <Typography
                            variant="body2"
                            sx={{ color: "var(--lr-text-secondary)", mt: 0.25 }}
                        >
                            Sign with your finger or a stylus. On a phone,
                            landscape gives a wider pad.
                        </Typography>
                    </DialogTitle>
                    <DialogContent>{pad(320)}</DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <StyledButton
                            onClick={clearPad}
                            sx={{ color: "var(--lr-text-secondary)" }}
                        >
                            Clear
                        </StyledButton>
                        <StyledButton
                            onClick={() => setPadExpanded(false)}
                            sx={{ color: "var(--lr-text-secondary)" }}
                        >
                            Cancel
                        </StyledButton>
                        <StyledButton
                            variant="contained"
                            disabled={!drawn}
                            onClick={() => {
                                void applySignature(drawn, "Drawn signature");
                                setPadExpanded(false);
                            }}
                            sx={primarySx}
                        >
                            Apply to card
                        </StyledButton>
                    </DialogActions>
                </Dialog>

                {/* The photo through the card's round window, larger, with drag and pinch. */}
                <Dialog
                    open={photoExpanded}
                    onClose={() => setPhotoExpanded(false)}
                    maxWidth="xs"
                    fullWidth
                >
                    <DialogTitle sx={{ fontSize: 18 }}>
                        Adjust photo
                        <Typography
                            variant="body2"
                            sx={{ color: "var(--lr-text-secondary)", mt: 0.25 }}
                        >
                            Drag to move. Pinch or scroll to zoom. The card
                            updates as you go.
                        </Typography>
                    </DialogTitle>
                    <DialogContent>
                        <Box
                            sx={{
                                width: "min(100%, 300px)",
                                mx: "auto",
                                my: 1,
                            }}
                        >
                            {photoExpanded && windowCanvas}
                        </Box>
                        <Box
                            sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 1,
                                mt: 2,
                            }}
                        >
                            {zoomRow}
                            <StyledButton
                                size="small"
                                variant="text"
                                startIcon={<CenterFocusStrongRounded />}
                                onClick={centrePhoto}
                                sx={{ color: BLUE }}
                            >
                                Center
                            </StyledButton>
                            <StyledButton
                                size="small"
                                variant="text"
                                startIcon={<RestartAltRounded />}
                                onClick={resetPhoto}
                                sx={{ color: BLUE }}
                            >
                                Reset
                            </StyledButton>
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <StyledButton
                            variant="contained"
                            startIcon={<CheckRounded />}
                            onClick={() => setPhotoExpanded(false)}
                            sx={primarySx}
                        >
                            Done
                        </StyledButton>
                    </DialogActions>
                </Dialog>

                <TermsDialog
                    open={terms !== null}
                    confirming={terms === "download"}
                    onClose={() => setTerms(null)}
                    onAgree={() => {
                        const confirming = terms === "download";
                        setTerms(null);
                        if (confirming) void download();
                    }}
                />
            </Container>
        </Box>
    );
}

export default LrId;
