import { SalesCutoffTimes } from "../types/app-data-types";

// Mirrors SalesEncodingService::closedBy: a month closes at its own cutoff; a month without one is
// closed once a later month's cutoff has passed. Returns the closing cutoff (ISO), or null while open.
export function closedBy(reservationDate: string, cutoffs: SalesCutoffTimes, now: Date = new Date()): string | null {
    const month = reservationDate.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) return null;

    const own = cutoffs[month];
    if (own) return new Date(own) <= now ? own : null;

    const later = Object.keys(cutoffs)
        .filter((m) => m > month && new Date(cutoffs[m]) <= now)
        .sort();

    return later.length ? cutoffs[later[0]] : null;
}

export function formatMonthYear(yyyyMm: string): string {
    const [y, m] = yyyyMm.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-PH", { month: "long", year: "numeric" });
}

export function formatCutoff(iso: string): string {
    return new Date(iso).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// The client-side twin of the server message, so the warning reads the same before and after submit.
export function closedMessage(reservationDate: string, cutoffs: SalesCutoffTimes): string | null {
    const cutoff = closedBy(reservationDate, cutoffs);

    return cutoff
        ? `Sales reserved in ${formatMonthYear(reservationDate.slice(0, 7))} closed on ${formatCutoff(cutoff)}. Ask a superadmin to move the cutoff if it still needs recording.`
        : null;
}
