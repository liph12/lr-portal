// "2026-10-01" (or a datetime) → "Oct 1, 2026"; parsed as a calendar date so time zones can't shift the day.
export function formatDate(value: string): string {
    const [y, m, d] = value.slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return value;

    return new Date(y, m - 1, d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

// "2026-09-30 14:05:00" → "Sep 30, 2026, 2:05 PM"; read as the stored (Philippine) local time, not converted.
export function formatDateTime(value: string): string {
    const [datePart, timePart = ""] = value.replace("T", " ").split(" ");
    const [y, m, d] = datePart.split("-").map(Number);
    const [hh = 0, mm = 0] = timePart.split(":").map(Number);
    if (!y || !m || !d) return value;

    return new Date(y, m - 1, d, hh, mm).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
