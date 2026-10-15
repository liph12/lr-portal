import { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { EventAvailableRounded, LockClockRounded } from "@mui/icons-material";
import NatconTrophyIcon from "./NatconTrophyIcon";
import { formatPeso } from "../../helpers/formatNumber";
import { formatDate, formatDateTime } from "../../helpers/formatDate";

// One NATCON edition (NatconService::edition): its period, specific cutoff, qualifier amount and Top Rent Managers' own period.
export interface NatconSettings {
    id: number;
    year: number;
    name: string;
    is_default: boolean;
    from: string;
    to: string;
    cutoff_at: string | null;
    qualifier_amount: number;
    rental_from: string;
    rental_to: string;
    rental_cutoff: string;
}

// What one board counts (NatconService::period): reservation dates and when its sales must have been encoded by.
export interface NatconBoardPeriod {
    from: string;
    to: string;
    cutoff_at: string | null;
}

export const periodLabel = (p: NatconBoardPeriod) => `${formatDate(p.from)} – ${formatDate(p.to)}`;

export const cutoffLabel = (p: NatconBoardPeriod) => (!p.cutoff_at ? "Not set yet — everything encoded so far counts" : formatDateTime(p.cutoff_at));

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
                label="Cutoff — sales encoded by"
                value={cutoffLabel(period)}
            />
            {qualifier !== undefined && <Fact icon={<NatconTrophyIcon fontSize="small" />} label="Qualifier: an agent's valid sales of at least" value={formatPeso(qualifier)} />}
        </Box>
    );
}
