// "2026-10-01" (or a datetime) → "Oct 1, 2026"; parsed as a calendar date so time zones can't shift the day.
export function formatDate(value: string): string {
    const [y, m, d] = value.slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return value;

    return new Date(y, m - 1, d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}
