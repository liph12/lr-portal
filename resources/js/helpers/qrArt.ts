import QRCode from "qrcode";

export type QrShape = "square" | "rounded" | "dots";
export type QrEyes = "square" | "rounded" | "circle";
export type QrLevel = "M" | "Q" | "H";

export interface QrArtOptions {
    shape?: QrShape;
    eyes?: QrEyes;
    level?: QrLevel;
    // Quiet zone around the code, in modules (a camera needs some; 0 only when the print adds its own).
    margin?: number;
    // Clear the middle for a picture; the code then uses the highest error correction.
    logo?: boolean;
    // The picture's width ÷ height, so the cleared area matches it.
    logoRatio?: number;
}

export interface QrArt {
    // The drawing's side, in modules (quiet zone included): the SVG viewBox is `0 0 side side`.
    side: number;
    count: number;
    quiet: number;
    // One path for every data module; `evenodd` fill.
    modules: string;
    // The three finder patterns, outer ring and centre as separate paths; `evenodd` fill.
    eyeRings: string;
    eyeCentres: string;
    logoBox: { x: number; y: number; w: number; h: number } | null;
}

// How tall the logo is, as a share of the whole code (quiet zone included).
const LOGO_HEIGHT = 0.3;
// Dot radius (of a module) is the smallest a strict decoder (jsQR) still reads; phone cameras are more forgiving.
const DOT_RADIUS = 0.47;
// Adjacent squares overlap by this much so no hairline seams show when the drawing is rasterised.
const SEAM = 0.03;

const n = (v: number) => +v.toFixed(3);

// Is (row, col) inside one of the three 7×7 finder patterns?
function inFinder(row: number, col: number, count: number): boolean {
    const near = (i: number) => i < 7;
    const far = (i: number) => i >= count - 7;
    return (near(row) && near(col)) || (near(row) && far(col)) || (far(row) && near(col));
}

function eyeRing(kind: QrEyes, x: number, y: number): string {
    switch (kind) {
        case "square":
            return `M${x} ${y}h7v7h-7zm1 1v5h5v-5z`;
        case "circle": {
            const cx = x + 3.5;
            const cy = y + 3.5;
            return `M${cx - 3.5} ${cy}a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0zM${cx - 2.5} ${cy}a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0z`;
        }
        default:
            return `M${x + 2} ${y}h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2zm0 1a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1z`;
    }
}

function eyeCentre(kind: QrEyes, x: number, y: number): string {
    switch (kind) {
        case "square":
            return `M${x + 2} ${y + 2}h3v3h-3z`;
        case "circle":
            return `M${x + 2} ${y + 3.5}a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z`;
        default:
            return `M${x + 3} ${y + 2}h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1z`;
    }
}

// Lays out a QR code for `value` as SVG path data, in the chosen style. Throws when the value is too long to encode.
export function buildQrArt(value: string, options: QrArtOptions = {}): QrArt {
    const { shape = "square", eyes = "rounded", level = "M", margin = 2, logo = false, logoRatio = 1 } = options;
    const modules = QRCode.create(value, { errorCorrectionLevel: logo ? "H" : level }).modules;
    const count = modules.size;
    const quiet = Math.max(0, margin);
    const side = count + quiet * 2;

    const h = logo ? side * LOGO_HEIGHT : 0;
    const w = h * logoRatio;
    const box = logo ? { x: (side - w) / 2, y: (side - h) / 2, w, h } : null;
    // A little breathing room around the picture that stays clear of modules.
    const pad = 0.6;
    const underLogo = (r: number, c: number) => {
        if (!box) return false;
        const cx = c + quiet + 0.5;
        const cy = r + quiet + 0.5;
        return cx > box.x - pad && cx < box.x + box.w + pad && cy > box.y - pad && cy < box.y + box.h + pad;
    };
    const dark = (r: number, c: number) => r >= 0 && c >= 0 && r < count && c < count && !!modules.get(r, c) && !inFinder(r, c, count) && !underLogo(r, c);

    const parts: string[] = [];
    for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
            if (!dark(r, c)) continue;
            const x = c + quiet;
            const y = r + quiet;
            if (shape === "dots") {
                parts.push(`M${n(x + 0.5 - DOT_RADIUS)} ${n(y + 0.5)}a${DOT_RADIUS} ${DOT_RADIUS} 0 1 0 ${n(DOT_RADIUS * 2)} 0a${DOT_RADIUS} ${DOT_RADIUS} 0 1 0-${n(DOT_RADIUS * 2)} 0z`);
                continue;
            }
            const up = dark(r - 1, c);
            const down = dark(r + 1, c);
            const left = dark(r, c - 1);
            const right = dark(r, c + 1);
            const x0 = x - (left ? SEAM : 0);
            const x1 = x + 1 + (right ? SEAM : 0);
            const y0 = y - (up ? SEAM : 0);
            const y1 = y + 1 + (down ? SEAM : 0);
            if (shape === "square") {
                parts.push(`M${n(x0)} ${n(y0)}H${n(x1)}V${n(y1)}H${n(x0)}z`);
                continue;
            }
            // Rounded: a corner is round only where the module stands free on both of its sides, so runs stay joined.
            const R = 0.5;
            const tl = !up && !left ? R : 0;
            const tr = !up && !right ? R : 0;
            const br = !down && !right ? R : 0;
            const bl = !down && !left ? R : 0;
            const arc = (radius: number, dx: number, dy: number) => (radius ? `a${radius} ${radius} 0 0 1 ${n(dx)} ${n(dy)}` : "");
            parts.push(
                `M${n(x0 + tl)} ${n(y0)}H${n(x1 - tr)}${arc(tr, tr, tr)}V${n(y1 - br)}${arc(br, -br, br)}H${n(x0 + bl)}${arc(bl, -bl, -bl)}V${n(y0 + tl)}${arc(tl, tl, -tl)}z`,
            );
        }
    }

    const corners: [number, number][] = [
        [quiet, quiet],
        [quiet + count - 7, quiet],
        [quiet, quiet + count - 7],
    ];

    return {
        side,
        count,
        quiet,
        modules: parts.join(""),
        eyeRings: corners.map(([x, y]) => eyeRing(eyes, x, y)).join(""),
        eyeCentres: corners.map(([x, y]) => eyeCentre(eyes, x, y)).join(""),
        logoBox: box,
    };
}

// Relative luminance (WCAG) of a #rrggbb colour.
export function luminance(hex: string): number {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return 1;
    const channel = (i: number) => {
        const v = parseInt(m[1].slice(i, i + 2), 16) / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

// How a camera will fare with these colours: the contrast ratio, and whether the code is lighter than its background
// (many phone readers only find dark-on-light codes).
export function qrReadability(color: string, background: string): { contrast: number; inverted: boolean } {
    const fg = luminance(color);
    const bg = luminance(background === "transparent" ? "#ffffff" : background);
    const contrast = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
    return { contrast: +contrast.toFixed(1), inverted: fg > bg };
}

// Can this value be encoded at all (a QR code holds about 2,900 characters at level M, far fewer with a logo)?
export function qrFits(value: string, level: QrLevel = "M"): boolean {
    try {
        QRCode.create(value, { errorCorrectionLevel: level });
        return true;
    } catch {
        return false;
    }
}
