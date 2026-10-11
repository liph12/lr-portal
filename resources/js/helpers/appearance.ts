import { FontSize } from "../types";

// Text size as a zoom of the whole page: sizes here are mostly fixed pixels, so a root font-size alone wouldn't reach them.
export const FONT_SCALES: Record<FontSize, number> = { small: 0.9, default: 1, large: 1.1, xlarge: 1.25 };

export const FONT_SIZE_LABELS: Record<FontSize, string> = { small: "Small", default: "Default", large: "Large", xlarge: "Extra large" };

// Also kept in localStorage so the script in app.blade.php applies it before first paint.
export function applyFontSize(size: FontSize) {
    const scale = FONT_SCALES[size] ?? 1;
    document.documentElement.style.setProperty("--lr-zoom", String(scale));
    try {
        if (scale === 1) localStorage.removeItem("lr-font-size");
        else localStorage.setItem("lr-font-size", String(scale));
    } catch {
        // Private mode: the size still applies for this page.
    }
}
