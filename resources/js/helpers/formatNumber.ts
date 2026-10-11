const COMPACT_STEPS: [number, string][] = [
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
];

const pesoFull = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });

const pesoExact = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const count = new Intl.NumberFormat("en-PH");

// ₱43M — for tiles, axes and labels where space is tight.
export function formatPesoCompact(value: number): string {
    const step = COMPACT_STEPS.find(([size]) => Math.abs(value) >= size);
    if (!step) return pesoFull.format(value);
    const scaled = value / step[0];
    // One decimal below 100 (₱1.5M), none above (₱430M), and never a trailing ".0".
    const digits = Math.abs(scaled) < 100 ? 1 : 0;
    return `₱${Number(scaled.toFixed(digits))}${step[1]}`;
}

// ₱43,000,000 — for tooltips and screen-reader tables, where the exact figure matters.
export function formatPeso(value: number): string {
    return pesoFull.format(value);
}

// ₱43,215,678.90 — the whole amount to the centavo, where nothing should be rounded (leaderboards).
export function formatPesoExact(value: number): string {
    return pesoExact.format(value);
}

export function formatCount(value: number): string {
    return count.format(value);
}

// Change vs a previous value as a whole percent; null when there's nothing meaningful to compare to.
export function percentChange(current: number, previous: number | null | undefined): number | null {
    if (previous === null || previous === undefined || previous === 0) return null;
    return Math.round(((current - previous) / previous) * 100);
}

export function formatMonth(yyyyMm: string, style: "short" | "long" = "short"): string {
    const [year, month] = yyyyMm.split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString("en-PH", {
        month: style === "short" ? "short" : "long",
        year: style === "short" ? undefined : "numeric",
    });
}
