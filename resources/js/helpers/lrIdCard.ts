import QRCode from "qrcode";

// The LR ID card as the old online generator (agentid.vercel.app) drew it: a 1050 × 1650 canvas per side with the
// official template stretched over it, the member's photo in the front's round window, the name, ID number and a QR
// code to their public profile on the front, their signature and the expiry date on the back. The front template has
// no window of its own any more: the photo is clipped to the circle and the ring drawn here.
// Every position below is in that 1050 × 1650 space, so the two generators print alike.

export const CARD_WIDTH = 1050;
export const CARD_HEIGHT = 1650;
export const INK = "#003b64";

export interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
}

// The photo window, where the old template's circle was.
export const PHOTO_WINDOW = { cx: 518, cy: 515, rx: 232, ry: 232 };
// A thin white border with a soft drop shadow, like the old generator's cards.
const BORDER_WIDTH = 8;
const SHADOW = { blur: 28, offsetY: 10, colour: "rgba(0,0,0,.35)" };
const EMPTY_WINDOW = "#e6ebf1";
// The photo at zoom 1: a square that covers the window.
const PHOTO_SIZE = 520;
export const SIGNATURE_BOX: Box = { x: 300, y: 120, w: 450, h: 130 };

const NAME = { x: 525, y: 835, size: 71, maxWidth: 900 };
const ID_NO = { x: 352, y: 1435, size: 45 };
const QR = { x: 280, y: 865, size: 500 };
const EXPIRY = { x: 515, y: 1448, size: 50 };

export interface FrontArt {
    template: HTMLImageElement;
    photo: HTMLImageElement | null;
    photoBox: Box;
    name: string;
    idNo: string;
    qrValue: string;
}

export interface BackArt {
    template: HTMLImageElement;
    signature: HTMLImageElement | null;
    signatureBox: Box;
    expiry: string;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        // The templates come from the Vite dev server (another port) in development: drawn without CORS they
        // would taint the canvas and the export would throw. The dev server allows it; same-origin is unaffected.
        if (!src.startsWith("data:")) image.crossOrigin = "anonymous";
        image.onload = () => resolve(image);
        image.onerror = () =>
            reject(new Error(`Could not load ${src.slice(0, 40)}`));
        image.src = src;
    });
}

// The photo scaled to cover the window (zoom 1) or larger, centred where the previous box was.
export function photoBoxFor(
    image: HTMLImageElement,
    zoom: number,
    centre?: { x: number; y: number },
): Box {
    const scale =
        (PHOTO_SIZE / Math.min(image.naturalWidth, image.naturalHeight)) * zoom;
    const w = image.naturalWidth * scale;
    const h = image.naturalHeight * scale;
    const cx = centre?.x ?? PHOTO_WINDOW.cx;
    const cy = centre?.y ?? PHOTO_WINDOW.cy;
    return { x: cx - w / 2, y: cy - h / 2, w, h };
}

// The signature keeps the template's proportions (450 × 130) whatever was drawn or uploaded, like the old generator.
export function signatureBoxFor(
    scale: number,
    centre?: { x: number; y: number },
): Box {
    const w = Math.round(SIGNATURE_BOX.w * scale);
    const h = Math.round(SIGNATURE_BOX.h * scale);
    const cx = centre?.x ?? SIGNATURE_BOX.x + SIGNATURE_BOX.w / 2;
    const cy = centre?.y ?? SIGNATURE_BOX.y + SIGNATURE_BOX.h / 2;
    return { x: cx - w / 2, y: cy - h / 2, w, h };
}

export const centreOf = (box: Box) => ({
    x: box.x + box.w / 2,
    y: box.y + box.h / 2,
});

// "14-OCT-2027", as the old generator printed the expiry date.
const MONTHS = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
];
export function formatExpiry(iso: string): string {
    const [year, month, day] = iso.slice(0, 10).split("-");
    return `${day}-${MONTHS[Number(month) - 1] ?? month}-${year}`;
}

// The largest font size (down to 8) at which the text fits the width.
function fitFontSize(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    size: number,
): number {
    let px = size;
    ctx.font = `bold ${px}px Arial`;
    while (ctx.measureText(text).width > maxWidth && px > 8) {
        px -= 1;
        ctx.font = `bold ${px}px Arial`;
    }
    return px;
}

function roundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
) {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// A QR code drawn as round dots with rounded finder "eyes" (the same look as the profile card's DotsQrCode), on a
// transparent background so the template shows through.
function drawDotsQr(
    ctx: CanvasRenderingContext2D,
    value: string,
    x: number,
    y: number,
    size: number,
) {
    const modules = QRCode.create(value, { errorCorrectionLevel: "M" }).modules;
    const n = modules.size;
    const quiet = 4;
    const unit = size / (n + quiet * 2);
    const inFinder = (row: number, col: number) => {
        const near = (v: number) => v < 7;
        const far = (v: number) => v >= n - 7;
        return (
            (near(row) && near(col)) ||
            (near(row) && far(col)) ||
            (far(row) && near(col))
        );
    };

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(unit, unit);
    ctx.fillStyle = INK;

    for (const [ey, ex] of [
        [quiet, quiet],
        [quiet, quiet + n - 7],
        [quiet + n - 7, quiet],
    ]) {
        ctx.beginPath();
        roundedRect(ctx, ex, ey, 7, 7, 2);
        roundedRect(ctx, ex + 1, ey + 1, 5, 5, 1);
        ctx.fill("evenodd");
        ctx.beginPath();
        roundedRect(ctx, ex + 2, ey + 2, 3, 3, 1);
        ctx.fill();
    }

    ctx.beginPath();
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            if (!modules.get(r, c) || inFinder(r, c)) continue;
            ctx.moveTo(c + quiet + 0.97, r + quiet + 0.5);
            ctx.arc(c + quiet + 0.5, r + quiet + 0.5, 0.47, 0, Math.PI * 2);
        }
    }
    ctx.fill();
    ctx.restore();
}

function windowPath(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.ellipse(
        PHOTO_WINDOW.cx,
        PHOTO_WINDOW.cy,
        PHOTO_WINDOW.rx,
        PHOTO_WINDOW.ry,
        0,
        0,
        Math.PI * 2,
    );
}

export function drawFront(ctx: CanvasRenderingContext2D, art: FrontArt) {
    ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
    ctx.drawImage(art.template, 0, 0, CARD_WIDTH, CARD_HEIGHT);

    // The shadow first, cast by a white disc the photo then covers. Shadow sizes ignore the context's scale, so
    // they are scaled by hand to look the same on the 2× export.
    const scale = ctx.getTransform().a || 1;
    ctx.save();
    windowPath(ctx);
    ctx.shadowColor = SHADOW.colour;
    ctx.shadowBlur = SHADOW.blur * scale;
    ctx.shadowOffsetY = SHADOW.offsetY * scale;
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.restore();

    // The photo shows only inside the circle; without one the circle is a soft disc so the gap is obvious.
    ctx.save();
    windowPath(ctx);
    ctx.clip();
    if (art.photo)
        ctx.drawImage(
            art.photo,
            art.photoBox.x,
            art.photoBox.y,
            art.photoBox.w,
            art.photoBox.h,
        );
    else {
        ctx.fillStyle = EMPTY_WINDOW;
        ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
    }
    ctx.restore();
    windowPath(ctx);
    ctx.lineWidth = BORDER_WIDTH;
    ctx.strokeStyle = "#fff";
    ctx.stroke();

    const size = fitFontSize(ctx, art.name, NAME.maxWidth, NAME.size);
    ctx.font = `bold ${size}px Arial`;
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(art.name, NAME.x, NAME.y);

    ctx.font = `bold ${ID_NO.size}px Arial`;
    ctx.textAlign = "left";
    ctx.fillText(art.idNo, ID_NO.x, ID_NO.y);

    drawDotsQr(ctx, art.qrValue, QR.x, QR.y, QR.size);
}

export function drawBack(ctx: CanvasRenderingContext2D, art: BackArt) {
    ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
    ctx.drawImage(art.template, 0, 0, CARD_WIDTH, CARD_HEIGHT);
    if (art.signature) {
        ctx.drawImage(
            art.signature,
            art.signatureBox.x,
            art.signatureBox.y,
            art.signatureBox.w,
            art.signatureBox.h,
        );
    }
    ctx.font = `bold ${EXPIRY.size}px Arial`;
    ctx.fillStyle = INK;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(art.expiry, EXPIRY.x, EXPIRY.y);
}

// One side as a PNG at `scale` × 1050 × 1650 (2 × prints crisply on a CR80 card).
export function renderSide(
    side: "front" | "back",
    art: FrontArt | BackArt,
    scale = 2,
): Promise<Blob> {
    const canvas = document.createElement("canvas");
    canvas.width = CARD_WIDTH * scale;
    canvas.height = CARD_HEIGHT * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return Promise.reject(new Error("Canvas is not available."));
    ctx.scale(scale, scale);
    if (side === "front") drawFront(ctx, art as FrontArt);
    else drawBack(ctx, art as BackArt);
    return new Promise((resolve, reject) =>
        canvas.toBlob(
            (blob) =>
                blob
                    ? resolve(blob)
                    : reject(new Error("Could not render the card.")),
            "image/png",
        ),
    );
}
