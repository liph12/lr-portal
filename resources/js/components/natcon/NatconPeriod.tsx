import { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { EmojiEventsRounded, EventAvailableRounded, LockClockRounded } from "@mui/icons-material";
import { formatPeso } from "../../helpers/formatNumber";
import { formatDate, formatDateTime } from "../../helpers/formatDate";
import { formatMonthYear } from "../../helpers/salesCutoff";

export interface NatconSettings {
    from: string;
    to: string;
    cutoff_month: string;
    qualifier_amount: number;
    cutoff_at: string | null;
    rental_from: string;
    rental_to: string;
    rental_cutoff: string;
}

// What one board counts (NatconService::period): a monthly cutoff (`cutoff_month`), or a cutoff date of its own (rentals).
export interface NatconBoardPeriod {
    from: string;
    to: string;
    cutoff_at: string | null;
    cutoff_month: string | null;
}

export const periodLabel = (p: NatconBoardPeriod) => `${formatDate(p.from)} – ${formatDate(p.to)}`;

export const cutoffLabel = (p: NatconBoardPeriod) =>
    !p.cutoff_at ? "Not set yet — everything encoded so far counts" : p.cutoff_month ? formatDateTime(p.cutoff_at) : `${formatDate(p.cutoff_at)}, end of day`;

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flex: "1 1 220px", minWidth: 0 }}>
            <Box sx={{ display: "grid", placeItems: "center", width: 36, height: 36, flexShrink: 0, borderRadius: 2, color: "var(--lr-primary)", backgroundColor: "var(--lr-primary-soft)" }}>{icon}</Box>
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                    {label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, color: "var(--lr-text-primary)" }}>
                    {value}
                </Typography>
            </Box>
        </Box>
    );
}

// What a NATCON board counts: valid sales reserved in the period and encoded by the cutoff (+ the qualifier amount).
export default function NatconPeriod({ period, qualifier, title = "NATCON period" }: { period: NatconBoardPeriod; qualifier?: number; title?: string }) {
    return (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, p: 2, mb: 3, borderRadius: 3, border: "1px solid var(--lr-border)", backgroundColor: "var(--lr-surface)" }}>
            <Fact icon={<EventAvailableRounded fontSize="small" />} label={`${title} (reservation date)`} value={periodLabel(period)} />
            <Fact
                icon={<LockClockRounded fontSize="small" />}
                label={period.cutoff_month ? `${formatMonthYear(period.cutoff_month)} cutoff — sales encoded by` : "Cutoff — sales encoded by"}
                value={cutoffLabel(period)}
            />
            {qualifier !== undefined && <Fact icon={<EmojiEventsRounded fontSize="small" />} label="Qualifier: an agent's valid sales of at least" value={formatPeso(qualifier)} />}
        </Box>
    );
}
