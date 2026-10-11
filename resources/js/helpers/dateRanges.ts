import { DateRangePreset } from "../components/utils/DateRangeField";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Quick ranges for report date pickers, worked out from today.
export function reportPresets(): DateRangePreset[] {
    const t = new Date();
    const y = t.getFullYear();
    const m = t.getMonth();
    return [
        { label: "This month", from: iso(new Date(y, m, 1)), to: iso(t) },
        { label: "Last month", from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) },
        { label: "This year", from: iso(new Date(y, 0, 1)), to: iso(t) },
        { label: "Last 12 months", from: iso(new Date(y, m - 11, 1)), to: iso(t) },
        { label: "Last year", from: iso(new Date(y - 1, 0, 1)), to: iso(new Date(y - 1, 11, 31)) },
        { label: "All time", from: "2000-01-01", to: iso(t) },
    ];
}
