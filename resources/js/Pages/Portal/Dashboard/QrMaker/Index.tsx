import { ChangeEvent, useMemo, useRef, useState } from "react";
import {
    Box,
    Chip,
    Collapse,
    Container,
    FormControlLabel,
    Grid,
    IconButton,
    InputAdornment,
    Stack,
    Switch,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from "@mui/material";
import {
    ContentCopyRounded,
    DeleteOutlineRounded,
    DownloadRounded,
    InfoOutlined,
    LinkRounded,
    QrCode2Rounded,
    WarningAmberRounded,
} from "@mui/icons-material";
import { Head, router, useForm } from "@inertiajs/react";
import PublicHeader from "../../../../components/layouts/PublicHeader";
import SectionTitle from "../../../../components/utils/SectionTitle";
import SectionCard from "../../../../components/cards/SectionCard";
import StyledButton from "../../../../components/utils/StyledButton";
import StyledTextField from "../../../../components/utils/StyledTextField";
import StyledQrCode from "../../../../components/utils/StyledQrCode";
import FieldLabel from "../../../../components/utils/forms/FieldLabel";
import ConfirmDialog from "../../../../components/utils/ConfirmDialog";
import { assessLink, normalizeLink } from "../../../../helpers/linkHealth";
import {
    QrEyes,
    QrShape,
    luminance,
    qrFits,
    qrReadability,
} from "../../../../helpers/qrArt";
import {
    qrFileName,
    saveBlob,
    svgMarkup,
    svgToPng,
    toDataUrl,
} from "../../../../helpers/qrExport";
import { toast } from "../../../../helpers/toast";
import { ShortLink } from "../../../../types/app-data-types";
// The Filipino Homes pin, the same mark the business-profile QR carries.
import FH_MARK from "../../../../../assets/qr-logo.png";

interface QrMakerProps {
    links: ShortLink[];
    // Where short links live (…/s), to show what one will look like before it is made.
    short_base: string;
    alias_reserved: string[];
}

// Colours are what the camera sees, not the page's theme, so these stay literal (the first two are the brand's).
const INKS = [
    { name: "Ink", hex: "#202124" },
    { name: "LR blue", hex: "#0055b3" },
    { name: "LR red", hex: "#d7141a" },
    { name: "Navy", hex: "#0f3051" },
];
// Every colour row shows five circles: presets plus the picker (the eye row gives one up to "match").
const EYE_INKS = INKS.slice(0, 3);
const PAPERS = [
    { name: "White", hex: "#ffffff" },
    { name: "Cream", hex: "#fff8e7" },
    { name: "Pale blue", hex: "#e9f1fb" },
    { name: "Transparent", hex: "transparent" },
];
// One PNG size: large enough for print at flyer size, small enough for a post.
const PNG_SIZE = 1024;
const LOGO_RATIO = 160 / 251;
// A camera needs clear space around the code; two modules is the least that still scans reliably, so it is not a choice.
const QUIET_ZONE = 2;

const toggleSx = {
    flexWrap: "wrap",
    ml: 0.5,
    "& .MuiToggleButton-root": {
        textTransform: "none",
        fontWeight: 500,
        fontSize: 13,
        px: 1.5,
        py: 0.75,
        gap: 0.75,
        color: "var(--lr-text-body)",
        borderColor: "var(--lr-border)",
        ":hover": { backgroundColor: "var(--lr-surface-hover)" },
        "&.Mui-selected": {
            color: "var(--lr-primary)",
            backgroundColor: "var(--lr-primary-soft)",
            borderColor: "var(--lr-primary-soft-strong)",
        },
        "&.Mui-selected:hover": {
            backgroundColor: "var(--lr-primary-soft-hover)",
        },
    },
};

const switchSx = {
    "& .MuiSwitch-switchBase.Mui-checked": { color: "var(--lr-primary)" },
    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
        backgroundColor: "var(--lr-primary)",
        opacity: 0.5,
    },
};

const noticeSx = (tone: "warning" | "success" | "info") => ({
    display: "flex",
    gap: 1.25,
    alignItems: "flex-start",
    p: 1.5,
    borderRadius: 2,
    backgroundColor:
        tone === "warning"
            ? "var(--lr-warning-soft)"
            : tone === "success"
              ? "var(--lr-success-soft)"
              : "var(--lr-primary-soft)",
    color: "var(--lr-text-body)",
    "& svg": {
        fontSize: 20,
        flexShrink: 0,
        mt: "1px",
        color:
            tone === "warning"
                ? "var(--lr-warning)"
                : tone === "success"
                  ? "var(--lr-success-icon)"
                  : "var(--lr-primary)",
    },
});

// A tiny drawing of the module or eye style, for the toggle buttons.
function StyleGlyph({ kind }: { kind: QrShape | `eye-${QrEyes}` }) {
    const fill = "currentColor";
    switch (kind) {
        case "square":
            return (
                <svg width="16" height="16" viewBox="0 0 16 16" fill={fill}>
                    <rect x="1" y="1" width="6" height="6" />
                    <rect x="9" y="1" width="6" height="6" />
                    <rect x="1" y="9" width="6" height="6" />
                </svg>
            );
        case "rounded":
            return (
                <svg width="16" height="16" viewBox="0 0 16 16" fill={fill}>
                    <rect x="1" y="1" width="14" height="6" rx="3" />
                    <rect x="1" y="9" width="6" height="6" rx="3" />
                </svg>
            );
        case "dots":
            return (
                <svg width="16" height="16" viewBox="0 0 16 16" fill={fill}>
                    <circle cx="4" cy="4" r="3" />
                    <circle cx="12" cy="4" r="3" />
                    <circle cx="4" cy="12" r="3" />
                </svg>
            );
        case "eye-square":
            return (
                <svg width="16" height="16" viewBox="0 0 16 16" fill={fill}>
                    <path fillRule="evenodd" d="M1 1h14v14H1zm2 2v10h10V3z" />
                    <rect x="5" y="5" width="6" height="6" />
                </svg>
            );
        case "eye-rounded":
            return (
                <svg width="16" height="16" viewBox="0 0 16 16" fill={fill}>
                    <path
                        fillRule="evenodd"
                        d="M4 1h8a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V4a3 3 0 0 1 3-3zm0 2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1z"
                    />
                    <rect x="5" y="5" width="6" height="6" rx="2" />
                </svg>
            );
        default:
            return (
                <svg width="16" height="16" viewBox="0 0 16 16" fill={fill}>
                    <path
                        fillRule="evenodd"
                        d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1zm0 2a5 5 0 1 0 0 10A5 5 0 0 0 8 3z"
                    />
                    <circle cx="8" cy="8" r="3" />
                </svg>
            );
    }
}

interface SwatchesProps {
    options: { name: string; hex: string }[];
    value: string;
    onChange: (hex: string) => void;
    // Offer a colour picker beside the presets.
    custom?: boolean;
    // An extra first swatch with its own meaning (e.g. "match the code colour"), shown in `hex` with a link mark.
    leading?: {
        title: string;
        hex: string;
        selected: boolean;
        onSelect: () => void;
    };
}

function Swatches({
    options,
    value,
    onChange,
    custom = true,
    leading,
}: SwatchesProps) {
    const isPreset = options.some((o) => o.hex === value);
    const ring = (selected: boolean) => ({
        width: 30,
        height: 30,
        borderRadius: "50%",
        cursor: "pointer",
        position: "relative" as const,
        border: "1px solid var(--lr-border)",
        boxShadow: selected
            ? "0 0 0 2px var(--lr-surface), 0 0 0 4px var(--lr-primary)"
            : "none",
        transition: "box-shadow 0.15s",
        flexShrink: 0,
    });
    return (
        <Stack direction="row" alignItems="center" gap={1.25} flexWrap="wrap" sx={{ pl: "8px", pt: "4px" }}>
            {leading && (
                <Tooltip title={leading.title}>
                    <Box
                        role="button"
                        aria-label={leading.title}
                        aria-pressed={leading.selected}
                        onClick={leading.onSelect}
                        sx={{
                            ...ring(leading.selected),
                            backgroundColor: leading.hex,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color:
                                luminance(leading.hex) > 0.4
                                    ? "#202124"
                                    : "#ffffff",
                        }}
                    >
                        <LinkRounded sx={{ fontSize: 16 }} />
                    </Box>
                </Tooltip>
            )}
            {options.map((o) => (
                <Tooltip key={o.hex} title={o.name}>
                    <Box
                        role="button"
                        aria-label={o.name}
                        aria-pressed={!leading?.selected && value === o.hex}
                        onClick={() => onChange(o.hex)}
                        sx={{
                            ...ring(!leading?.selected && value === o.hex),
                            backgroundColor:
                                o.hex === "transparent"
                                    ? "var(--lr-surface)"
                                    : o.hex,
                            backgroundImage:
                                o.hex === "transparent"
                                    ? "linear-gradient(45deg, var(--lr-surface-container) 25%, transparent 25%, transparent 75%, var(--lr-surface-container) 75%), linear-gradient(45deg, var(--lr-surface-container) 25%, transparent 25%, transparent 75%, var(--lr-surface-container) 75%)"
                                    : "none",
                            backgroundSize: "10px 10px",
                            backgroundPosition: "0 0, 5px 5px",
                        }}
                    />
                </Tooltip>
            ))}
            {custom && (
                <Tooltip title="Pick any colour">
                    <Box
                        component="label"
                        sx={{
                            ...ring(!leading?.selected && !isPreset),
                            background:
                                !isPreset && value !== "transparent"
                                    ? value
                                    : "conic-gradient(#d7141a, #f4a300, #137333, #0055b3, #6a1b9a, #d7141a)",
                            overflow: "hidden",
                        }}
                    >
                        <Box
                            component="input"
                            type="color"
                            aria-label="Custom colour"
                            value={
                                /^#[0-9a-f]{6}$/i.test(value)
                                    ? value
                                    : "#0055b3"
                            }
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                onChange(e.target.value)
                            }
                            sx={{
                                position: "absolute",
                                inset: 0,
                                width: "100%",
                                height: "100%",
                                opacity: 0,
                                cursor: "pointer",
                            }}
                        />
                    </Box>
                </Tooltip>
            )}
        </Stack>
    );
}

function copyText(text: string, done: string) {
    navigator.clipboard
        .writeText(text)
        .then(() => toast.success(done))
        .catch(() => toast.error("Couldn't copy."));
}

function QrMaker({ links, short_base, alias_reserved }: QrMakerProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    const form = useForm({ url: "", alias: "", title: "" });

    const [shape, setShape] = useState<QrShape>("rounded");
    const [eyes, setEyes] = useState<QrEyes>("rounded");
    const [color, setColor] = useState(INKS[0].hex);
    const [background, setBackground] = useState(PAPERS[0].hex);
    const [eyeColor, setEyeColor] = useState<string | null>(null);
    const [logoOn, setLogoOn] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [removing, setRemoving] = useState<ShortLink | null>(null);

    const normalized = normalizeLink(form.data.url);
    const health = useMemo(() => assessLink(form.data.url), [form.data.url]);
    const shortPrefix = `${short_base}/`;
    const isShortAlready = normalized
        .toLowerCase()
        .startsWith(shortPrefix.toLowerCase());
    // The short link already made for this address (or the one being typed in, when it is itself a short link).
    const existing = useMemo(
        () =>
            links.find((l) =>
                isShortAlready
                    ? l.short_url.toLowerCase() === normalized.toLowerCase()
                    : l.url === normalized,
            ),
        [links, normalized, isShortAlready],
    );
    // Every code opens through a short LR link (scans are counted, people see Leuterio Realty first): there is nothing to
    // encode until the short link exists.
    const target = isShortAlready ? normalized : (existing?.short_url ?? "");
    const fits = target !== "" && qrFits(target, logoOn ? "H" : "M");
    const readability = qrReadability(color, background);

    const setUrl = (value: string) => {
        form.setData("url", value);
        form.clearErrors("url");
    };

    const createShortLink = () =>
        form.post("/dashboard/qr-maker/links", {
            preserveScroll: true,
            onSuccess: () => {
                form.setData((d) => ({ ...d, alias: "", title: "" }));
            },
        });

    const download = async (kind: "png" | "svg") => {
        const svg = svgRef.current;
        if (!svg) return;
        setExporting(true);
        try {
            const markup = svgMarkup(
                svg,
                PNG_SIZE,
                logoOn ? await toDataUrl(FH_MARK) : undefined,
            );
            if (kind === "svg") {
                saveBlob(
                    new Blob([markup], { type: "image/svg+xml" }),
                    qrFileName(target, "svg"),
                );
            } else {
                saveBlob(
                    await svgToPng(markup, PNG_SIZE),
                    qrFileName(target, "png"),
                );
            }
            toast.success(kind === "svg" ? "SVG saved." : "PNG saved.");
        } catch {
            toast.error("Couldn't save the QR code.");
        } finally {
            setExporting(false);
        }
    };

    const useLink = (link: ShortLink) => {
        form.setData("url", link.url);
        form.clearErrors();
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const remove = () => {
        if (!removing) return;
        router.delete(`/dashboard/qr-maker/links/${removing.id}`, {
            preserveScroll: true,
            onFinish: () => setRemoving(null),
        });
    };

    const aliasHint =
        form.data.alias &&
        alias_reserved.includes(form.data.alias.trim().toLowerCase())
            ? "That alias is kept for the portal."
            : null;

    return (
        // Like Generate LR ID: outside AppLayout, just the public header over the content, scrolling on its own.
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
            <Head title="QR Code Maker" />
            <PublicHeader />
            <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4 }, flex: 1 }}>
                <SectionTitle
                    title="QR Code Maker"
                    subtitle="A QR code for any link, in your style — with a short LR link in front of it when you want one."
                />

                <Grid
                    container
                    spacing={{ xs: 2, lg: 3 }}
                    alignItems="flex-start"
                >
                    <Grid size={{ xs: 12, lg: 7 }}>
                        <Stack gap={{ xs: 2, lg: 3 }}>
                            <SectionCard
                                title="Link"
                                subtitle="Paste any web address. Every code opens through a short LR link, so scans are counted and people see Leuterio Realty first."
                            >
                                <Stack gap={2}>
                                    <Box>
                                        <FieldLabel
                                            text="Web address"
                                            required
                                        />
                                        <StyledTextField
                                            name="url"
                                            value={form.data.url}
                                            placeholder="https://www.filipinohomes.com/…"
                                            error={
                                                form.errors.url ??
                                                (form.data.url.trim() &&
                                                !health.valid
                                                    ? "Enter a full web address, like https://example.com/page."
                                                    : null)
                                            }
                                            handleChange={(e) =>
                                                setUrl(e.target.value)
                                            }
                                            props={{
                                                slotProps: {
                                                    input: {
                                                        startAdornment: (
                                                            <InputAdornment position="start">
                                                                <LinkRounded
                                                                    sx={{
                                                                        fontSize: 18,
                                                                        color: "var(--lr-text-secondary)",
                                                                    }}
                                                                />
                                                            </InputAdornment>
                                                        ),
                                                    },
                                                },
                                            }}
                                        />
                                    </Box>

                                    <Collapse in={isShortAlready}>
                                        <Box sx={noticeSx("info")}>
                                            <InfoOutlined />
                                            <Typography variant="body2">
                                                This is already a short LR link;
                                                the code opens it as it is.
                                            </Typography>
                                        </Box>
                                    </Collapse>

                                    <Collapse
                                        in={health.valid && !isShortAlready}
                                    >
                                        {existing ? (
                                            <Box
                                                sx={{
                                                    ...noticeSx("success"),
                                                    alignItems: "center",
                                                }}
                                            >
                                                <LinkRounded />
                                                <Box
                                                    sx={{
                                                        flex: 1,
                                                        minWidth: 0,
                                                    }}
                                                >
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            fontWeight: 600,
                                                            color: "var(--lr-text-primary)",
                                                            wordBreak:
                                                                "break-all",
                                                        }}
                                                    >
                                                        {existing.short_url}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            color: "var(--lr-text-secondary)",
                                                        }}
                                                    >
                                                        Your code opens this
                                                        short link ·{" "}
                                                        {existing.clicks}{" "}
                                                        {existing.clicks === 1
                                                            ? "visit"
                                                            : "visits"}{" "}
                                                        so far
                                                    </Typography>
                                                </Box>
                                                <Tooltip title="Copy short link">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() =>
                                                            copyText(
                                                                existing.short_url,
                                                                "Short link copied.",
                                                            )
                                                        }
                                                        sx={{
                                                            color: "var(--lr-text-secondary)",
                                                        }}
                                                    >
                                                        <ContentCopyRounded
                                                            sx={{
                                                                fontSize: 18,
                                                            }}
                                                        />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        ) : (
                                            <Box
                                                sx={{
                                                    p: 2,
                                                    borderRadius: 2,
                                                    border: "1px dashed var(--lr-outline)",
                                                    backgroundColor:
                                                        "var(--lr-surface-dim)",
                                                }}
                                            >
                                                <Grid container spacing={2}>
                                                    <Grid
                                                        size={{ xs: 12, sm: 6 }}
                                                    >
                                                        <FieldLabel text="Alias (optional)" />
                                                        <StyledTextField
                                                            name="alias"
                                                            value={
                                                                form.data.alias
                                                            }
                                                            placeholder="open-house-cebu"
                                                            error={
                                                                form.errors
                                                                    .alias ??
                                                                aliasHint
                                                            }
                                                            handleChange={(
                                                                e,
                                                            ) => (
                                                                form.setData(
                                                                    "alias",
                                                                    e.target.value
                                                                        .toLowerCase()
                                                                        .replace(
                                                                            /\s+/g,
                                                                            "-",
                                                                        ),
                                                                ),
                                                                form.clearErrors(
                                                                    "alias",
                                                                )
                                                            )}
                                                            props={{
                                                                slotProps: {
                                                                    input: {
                                                                        startAdornment:
                                                                            (
                                                                                <InputAdornment position="start">
                                                                                    <Typography
                                                                                        variant="caption"
                                                                                        sx={{
                                                                                            color: "var(--lr-text-secondary)",
                                                                                            whiteSpace:
                                                                                                "nowrap",
                                                                                        }}
                                                                                    >
                                                                                        {shortPrefix.replace(
                                                                                            /^https?:\/\//,
                                                                                            "",
                                                                                        )}
                                                                                    </Typography>
                                                                                </InputAdornment>
                                                                            ),
                                                                    },
                                                                },
                                                            }}
                                                        />
                                                    </Grid>
                                                    <Grid
                                                        size={{ xs: 12, sm: 6 }}
                                                    >
                                                        <FieldLabel text="Title (optional)" />
                                                        <StyledTextField
                                                            name="title"
                                                            value={
                                                                form.data.title
                                                            }
                                                            placeholder="Open house flyer"
                                                            error={
                                                                form.errors
                                                                    .title ??
                                                                null
                                                            }
                                                            handleChange={(e) =>
                                                                form.setData(
                                                                    "title",
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                        />
                                                    </Grid>
                                                </Grid>
                                                <Stack
                                                    direction="row"
                                                    alignItems="center"
                                                    justifyContent="space-between"
                                                    gap={2}
                                                    flexWrap="wrap"
                                                    sx={{ mt: 2 }}
                                                >
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            color: "var(--lr-text-secondary)",
                                                        }}
                                                    >
                                                        Without an alias you get
                                                        a 6-character code, like{" "}
                                                        {shortPrefix.replace(
                                                            /^https?:\/\//,
                                                            "",
                                                        )}
                                                        k7m2xq. A readable alias
                                                        builds more trust.
                                                    </Typography>
                                                    <StyledButton
                                                        variant="contained"
                                                        size="small"
                                                        onClick={
                                                            createShortLink
                                                        }
                                                        disabled={
                                                            form.processing ||
                                                            !health.valid
                                                        }
                                                        sx={{
                                                            px: 2.5,
                                                            backgroundColor:
                                                                "var(--lr-primary)",
                                                            color: "var(--lr-on-primary)",
                                                            ":hover": {
                                                                backgroundColor:
                                                                    "var(--lr-primary-hover)",
                                                            },
                                                        }}
                                                    >
                                                        {form.processing
                                                            ? "Creating…"
                                                            : "Create short link"}
                                                    </StyledButton>
                                                </Stack>
                                            </Box>
                                        )}
                                    </Collapse>
                                </Stack>
                            </SectionCard>

                            <SectionCard
                                title="Design"
                                subtitle="Shapes and colours; the code stays readable with any of these."
                            >
                                <Stack gap={2.5}>
                                    <Grid container spacing={2.5}>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <FieldLabel text="Modules" />
                                            <ToggleButtonGroup
                                                exclusive
                                                size="small"
                                                value={shape}
                                                onChange={(
                                                    _,
                                                    v: QrShape | null,
                                                ) => v && setShape(v)}
                                                sx={toggleSx}
                                            >
                                                <ToggleButton value="square">
                                                    <StyleGlyph kind="square" />
                                                    Squares
                                                </ToggleButton>
                                                <ToggleButton value="rounded">
                                                    <StyleGlyph kind="rounded" />
                                                    Rounded
                                                </ToggleButton>
                                                <ToggleButton value="dots">
                                                    <StyleGlyph kind="dots" />
                                                    Dots
                                                </ToggleButton>
                                            </ToggleButtonGroup>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <FieldLabel text="Eyes (the three corners)" />
                                            <ToggleButtonGroup
                                                exclusive
                                                size="small"
                                                value={eyes}
                                                onChange={(
                                                    _,
                                                    v: QrEyes | null,
                                                ) => v && setEyes(v)}
                                                sx={toggleSx}
                                            >
                                                <ToggleButton value="square">
                                                    <StyleGlyph kind="eye-square" />
                                                    Square
                                                </ToggleButton>
                                                <ToggleButton value="rounded">
                                                    <StyleGlyph kind="eye-rounded" />
                                                    Rounded
                                                </ToggleButton>
                                                <ToggleButton value="circle">
                                                    <StyleGlyph kind="eye-circle" />
                                                    Round
                                                </ToggleButton>
                                            </ToggleButtonGroup>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <FieldLabel text="Code colour" />
                                            <Swatches
                                                options={INKS}
                                                value={color}
                                                onChange={setColor}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <FieldLabel text="Eye colour" />
                                            <Swatches
                                                options={EYE_INKS}
                                                value={eyeColor ?? color}
                                                onChange={setEyeColor}
                                                leading={{
                                                    title: "Match the code colour",
                                                    hex: color,
                                                    selected: eyeColor === null,
                                                    onSelect: () =>
                                                        setEyeColor(null),
                                                }}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <FieldLabel text="Background" />
                                            <Swatches
                                                options={PAPERS}
                                                value={background}
                                                onChange={setBackground}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <FieldLabel text="Centre mark" />
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={logoOn}
                                                        onChange={(e) =>
                                                            setLogoOn(
                                                                e.target
                                                                    .checked,
                                                            )
                                                        }
                                                        sx={switchSx}
                                                    />
                                                }
                                                label={
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            color: "var(--lr-text-primary)",
                                                        }}
                                                    >
                                                        Filipino Homes mark in
                                                        the middle
                                                    </Typography>
                                                }
                                                sx={{ ml: -1, mt: 0.25 }}
                                            />
                                        </Grid>
                                    </Grid>
                                    <Collapse
                                        in={
                                            readability.inverted ||
                                            readability.contrast < 3
                                        }
                                    >
                                        <Box sx={noticeSx("warning")}>
                                            <WarningAmberRounded />
                                            <Typography variant="body2">
                                                {readability.inverted
                                                    ? "The code is lighter than its background. Many phone cameras only find dark codes on a light background — swap the colours before printing."
                                                    : `Low contrast (${readability.contrast}:1). Cameras need about 3:1 or more; pick a darker code colour or a lighter background.`}
                                            </Typography>
                                        </Box>
                                    </Collapse>
                                </Stack>
                            </SectionCard>
                        </Stack>
                    </Grid>

                    <Grid
                        size={{ xs: 12, lg: 5 }}
                        sx={{
                            position: { lg: "sticky" },
                            top: { lg: 16 },
                            maxHeight: { lg: "calc(100dvh - 32px)" },
                            overflowY: { lg: "auto" },
                        }}
                    >
                        <SectionCard
                            title="Preview"
                            subtitle="Scan it with your phone before you print."
                            fill
                        >
                            <Stack gap={2}>
                                <Box
                                    sx={{
                                        width: "100%",
                                        aspectRatio: "1 / 1",
                                        borderRadius: 3,
                                        border: "1px solid var(--lr-border)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        overflow: "hidden",
                                        backgroundColor:
                                            background === "transparent"
                                                ? "var(--lr-surface)"
                                                : background,
                                        backgroundImage:
                                            background === "transparent"
                                                ? "linear-gradient(45deg, var(--lr-surface-container) 25%, transparent 25%, transparent 75%, var(--lr-surface-container) 75%), linear-gradient(45deg, var(--lr-surface-container) 25%, transparent 25%, transparent 75%, var(--lr-surface-container) 75%)"
                                                : "none",
                                        backgroundSize: "16px 16px",
                                        backgroundPosition: "0 0, 8px 8px",
                                    }}
                                >
                                    {fits ? (
                                        <StyledQrCode
                                            ref={svgRef}
                                            value={target}
                                            size="100%"
                                            shape={shape}
                                            eyes={eyes}
                                            level="M"
                                            margin={QUIET_ZONE}
                                            color={color}
                                            background={background}
                                            eyeColor={eyeColor ?? undefined}
                                            logo={logoOn ? FH_MARK : undefined}
                                            logoRatio={LOGO_RATIO}
                                            label={`QR code for ${target}`}
                                        />
                                    ) : (
                                        <Stack
                                            alignItems="center"
                                            gap={1}
                                            sx={{
                                                p: 3,
                                                textAlign: "center",
                                                color: "var(--lr-text-secondary)",
                                            }}
                                        >
                                            <QrCode2Rounded
                                                sx={{
                                                    fontSize: 56,
                                                    opacity: 0.4,
                                                }}
                                            />
                                            <Typography variant="body2">
                                                {health.valid
                                                    ? "Create the short link to get your QR code."
                                                    : "Paste a web address to start."}
                                            </Typography>
                                        </Stack>
                                    )}
                                </Box>

                                {fits && (
                                    <Box sx={{ width: "100%" }}>
                                        <Stack
                                            direction="row"
                                            alignItems="center"
                                            gap={1}
                                            sx={{ mb: 0.5 }}
                                        >
                                            <Chip
                                                label="Short LR link"
                                                size="small"
                                                sx={{
                                                    height: 22,
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    color: "var(--lr-success)",
                                                    backgroundColor:
                                                        "var(--lr-success-soft)",
                                                }}
                                            />
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: "var(--lr-text-secondary)",
                                                }}
                                            >
                                                {target.length} characters
                                                encoded
                                            </Typography>
                                            <Box sx={{ flex: 1 }} />
                                            <Tooltip title="Copy the encoded link">
                                                <IconButton
                                                    size="small"
                                                    onClick={() =>
                                                        copyText(
                                                            target,
                                                            "Link copied.",
                                                        )
                                                    }
                                                    sx={{
                                                        color: "var(--lr-text-secondary)",
                                                    }}
                                                >
                                                    <ContentCopyRounded
                                                        sx={{ fontSize: 18 }}
                                                    />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontFamily:
                                                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                                                fontSize: 12.5,
                                                color: "var(--lr-text-body)",
                                                wordBreak: "break-all",
                                                p: 1.25,
                                                borderRadius: 2,
                                                backgroundColor:
                                                    "var(--lr-surface-container)",
                                            }}
                                        >
                                            {target}
                                        </Typography>
                                    </Box>
                                )}

                                <Box
                                    sx={{
                                        width: "100%",
                                        pt: 1,
                                        borderTop: "1px solid var(--lr-border)",
                                    }}
                                >
                                    <Stack
                                        direction="row"
                                        gap={1}
                                        flexWrap="wrap"
                                    >
                                        <StyledButton
                                            variant="contained"
                                            startIcon={<DownloadRounded />}
                                            disabled={!fits || exporting}
                                            onClick={() => download("png")}
                                            sx={{
                                                px: 2.5,
                                                backgroundColor:
                                                    "var(--lr-primary)",
                                                color: "var(--lr-on-primary)",
                                                ":hover": {
                                                    backgroundColor:
                                                        "var(--lr-primary-hover)",
                                                },
                                            }}
                                        >
                                            {exporting
                                                ? "Saving…"
                                                : "Download PNG"}
                                        </StyledButton>
                                        <StyledButton
                                            variant="outlined"
                                            startIcon={<DownloadRounded />}
                                            disabled={!fits || exporting}
                                            onClick={() => download("svg")}
                                            sx={{
                                                px: 2.5,
                                                color: "var(--lr-text-body)",
                                                borderColor:
                                                    "var(--lr-outline)",
                                                ":hover": {
                                                    borderColor:
                                                        "var(--lr-outline)",
                                                    backgroundColor:
                                                        "var(--lr-surface-hover)",
                                                },
                                            }}
                                        >
                                            Download SVG
                                        </StyledButton>
                                    </Stack>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            display: "block",
                                            mt: 1,
                                            color: "var(--lr-text-secondary)",
                                        }}
                                    >
                                        PNG for posts and flyers; SVG prints
                                        sharp at any size.
                                    </Typography>
                                </Box>
                            </Stack>
                        </SectionCard>
                    </Grid>
                </Grid>

                {/* Outside the two-column grid, so the sticky preview stops at the end of its row instead of over this card. */}
                <Box sx={{ mt: { xs: 2, lg: 3 } }}>
                    <SectionCard
                        title="Your short links"
                        subtitle="Every short link you've made, with how often it was opened. Removing one stops the QR codes that use it."
                    >
                        {links.length === 0 ? (
                            <Typography
                                variant="body2"
                                sx={{ color: "var(--lr-text-secondary)" }}
                            >
                                No short links yet. Switch one on above to make
                                your first.
                            </Typography>
                        ) : (
                            <Stack
                                divider={
                                    <Box
                                        sx={{
                                            borderTop:
                                                "1px solid var(--lr-border)",
                                        }}
                                    />
                                }
                            >
                                {links.map((link) => (
                                    <Stack
                                        key={link.id}
                                        direction={{
                                            xs: "column",
                                            sm: "row",
                                        }}
                                        alignItems={{ sm: "center" }}
                                        gap={{ xs: 1, sm: 2 }}
                                        sx={{ py: 1.5 }}
                                    >
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Stack
                                                direction="row"
                                                alignItems="center"
                                                gap={1}
                                                flexWrap="wrap"
                                            >
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: 600,
                                                        color: "var(--lr-text-primary)",
                                                        wordBreak: "break-all",
                                                    }}
                                                >
                                                    {link.short_url.replace(
                                                        /^https?:\/\//,
                                                        "",
                                                    )}
                                                </Typography>
                                                {link.title && (
                                                    <Chip
                                                        label={link.title}
                                                        size="small"
                                                        sx={{
                                                            height: 20,
                                                            fontSize: 11,
                                                            backgroundColor:
                                                                "var(--lr-surface-container)",
                                                            color: "var(--lr-text-body)",
                                                        }}
                                                    />
                                                )}
                                            </Stack>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    display: "block",
                                                    color: "var(--lr-text-secondary)",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                → {link.url}
                                            </Typography>
                                        </Box>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: "var(--lr-text-secondary)",
                                                whiteSpace: "nowrap",
                                                minWidth: 120,
                                            }}
                                        >
                                            {link.clicks}{" "}
                                            {link.clicks === 1
                                                ? "visit"
                                                : "visits"}{" "}
                                            · {link.created_at}
                                        </Typography>
                                        <Stack
                                            direction="row"
                                            alignItems="center"
                                            gap={0.5}
                                        >
                                            <StyledButton
                                                size="small"
                                                startIcon={<QrCode2Rounded />}
                                                onClick={() => useLink(link)}
                                                sx={{
                                                    px: 1.5,
                                                    color: "var(--lr-primary)",
                                                    ":hover": {
                                                        backgroundColor:
                                                            "var(--lr-primary-soft)",
                                                    },
                                                }}
                                            >
                                                Make QR
                                            </StyledButton>
                                            <Tooltip title="Copy short link">
                                                <IconButton
                                                    size="small"
                                                    onClick={() =>
                                                        copyText(
                                                            link.short_url,
                                                            "Short link copied.",
                                                        )
                                                    }
                                                    sx={{
                                                        color: "var(--lr-text-secondary)",
                                                    }}
                                                >
                                                    <ContentCopyRounded
                                                        sx={{
                                                            fontSize: 18,
                                                        }}
                                                    />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Remove">
                                                <IconButton
                                                    size="small"
                                                    onClick={() =>
                                                        setRemoving(link)
                                                    }
                                                    sx={{
                                                        color: "var(--lr-text-secondary)",
                                                        ":hover": {
                                                            color: "var(--lr-error)",
                                                        },
                                                    }}
                                                >
                                                    <DeleteOutlineRounded
                                                        sx={{
                                                            fontSize: 18,
                                                        }}
                                                    />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </Stack>
                                ))}
                            </Stack>
                        )}
                    </SectionCard>
                </Box>

                <ConfirmDialog
                    open={removing !== null}
                    title="Remove this short link?"
                    message={
                        removing ? (
                            <>
                                <b>{removing.short_url}</b> will stop working,
                                and every QR code or post that uses it will lead
                                nowhere. The full address itself is not
                                affected.
                            </>
                        ) : null
                    }
                    confirmLabel="Remove"
                    onConfirm={remove}
                    onClose={() => setRemoving(null)}
                />
            </Container>
        </Box>
    );
}

export default QrMaker;
