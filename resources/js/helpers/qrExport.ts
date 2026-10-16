// Saving a QR code drawn as SVG: the markup on its own, or rasterised to a PNG of a given size.

// An asset's URL as a data URL, so a picture inside an exported SVG travels with it (an <img> can't load external files).
export async function toDataUrl(url: string): Promise<string> {
    const blob = await (await fetch(url)).blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

// Standalone SVG markup for the drawing, `px` wide and tall, with its picture (if any) embedded.
export function svgMarkup(svg: SVGSVGElement, px: number, logoDataUrl?: string): string {
    const copy = svg.cloneNode(true) as SVGSVGElement;
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    copy.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    copy.setAttribute("width", String(px));
    copy.setAttribute("height", String(px));
    copy.removeAttribute("style");
    copy.removeAttribute("class");
    if (logoDataUrl) {
        copy.querySelectorAll("image").forEach((img) => img.setAttribute("href", logoDataUrl));
    }
    return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(copy)}`;
}

export function svgToPng(markup: string, px: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = px;
            canvas.height = px;
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("No canvas"));
            ctx.drawImage(image, 0, 0, px, px);
            canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No image"))), "image/png");
        };
        image.onerror = () => reject(new Error("The drawing could not be rendered."));
        image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
    });
}

export function saveBlob(blob: Blob, filename: string): void {
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
}

// A file name from what the code opens: the host and the last word of the path.
export function qrFileName(target: string, ext: string): string {
    let base = "qr-code";
    try {
        const url = new URL(target);
        const last = url.pathname.split("/").filter(Boolean).pop();
        base = [url.hostname.replace(/^www\./, ""), last].filter(Boolean).join("-");
    } catch {
        // Not a URL: the default name does.
    }
    return `${base.replace(/[^a-z0-9.-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "qr-code"}.${ext}`;
}
