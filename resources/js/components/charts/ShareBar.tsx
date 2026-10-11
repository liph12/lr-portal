import { Box, Tooltip, Typography } from "@mui/material";
import { srOnly } from "./srOnly";

export interface ShareSegment {
    label: string;
    value: number;
}

interface ShareBarProps {
    segments: ShareSegment[];
    caption: string;
    unit: [singular: string, plural: string];
    emptyText: string;
}

// Categorical slots in fixed order, so a segment keeps its colour even when others are zero.
const SERIES = ["var(--lr-series-1)", "var(--lr-series-2)", "var(--lr-series-3)"];

// Part-to-whole as one stacked bar, with a legend that repeats every count (colour is never the only cue).
export default function ShareBar({ segments, caption, unit, emptyText }: ShareBarProps) {
    const total = segments.reduce((sum, s) => sum + s.value, 0);
    const word = (n: number) => (n === 1 ? unit[0] : unit[1]);

    if (total === 0) {
        return (
            <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", py: 3, textAlign: "center" }}>
                {emptyText}
            </Typography>
        );
    }

    return (
        <Box component="figure" sx={{ m: 0 }}>
            <Box aria-hidden sx={{ display: "flex", gap: "2px", height: 14, borderRadius: 99, overflow: "hidden", backgroundColor: "var(--lr-surface-container)" }}>
                {segments.map((s, i) =>
                    s.value > 0 ? (
                        <Tooltip key={s.label} title={`${s.label}: ${s.value} ${word(s.value)} (${Math.round((s.value / total) * 100)}%)`}>
                            <Box sx={{ width: `${(s.value / total) * 100}%`, backgroundColor: SERIES[i % SERIES.length] }} />
                        </Tooltip>
                    ) : null,
                )}
            </Box>

            <Box component="ul" aria-hidden sx={{ listStyle: "none", m: 0, mt: 2, p: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                {segments.map((s, i) => (
                    <Box component="li" key={s.label} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: "3px", flexShrink: 0, backgroundColor: SERIES[i % SERIES.length] }} />
                        <Typography variant="body2" sx={{ flex: 1, color: "var(--lr-text-body)" }}>
                            {s.label}
                        </Typography>
                        <Typography variant="body2" fontFamily="Google Sans Code" sx={{ color: "var(--lr-text-primary)" }}>
                            {s.value}
                        </Typography>
                        <Typography variant="caption" sx={{ width: 40, textAlign: "right", color: "var(--lr-text-secondary)" }}>
                            {Math.round((s.value / total) * 100)}%
                        </Typography>
                    </Box>
                ))}
            </Box>

            <Box component="table" sx={srOnly}>
                <caption>{caption}</caption>
                <tbody>
                    {segments.map((s) => (
                        <tr key={s.label}>
                            <th scope="row">{s.label}</th>
                            <td>
                                {s.value} {word(s.value)}
                            </td>
                            <td>{Math.round((s.value / total) * 100)}%</td>
                        </tr>
                    ))}
                </tbody>
            </Box>
        </Box>
    );
}
