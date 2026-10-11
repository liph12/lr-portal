import { Box, ButtonBase, Grid, Typography } from "@mui/material";
import { CATEGORY_LABELS } from "../reports/ReportStatistics";
import { formatCount, formatPeso } from "../../helpers/formatNumber";

export interface CategoryTotal {
    category: string;
    sales: number;
    value: number;
}

interface SalesTotalsProps {
    totals: CategoryTotal[];
    // The picked category (null = all); a tile picks its category, the total tile clears it.
    category: string | null;
    onPick: (category: string) => void;
}

const ORDER = ["project", "brokerage", "rental"];

const salesWord = (n: number) => `${formatCount(n)} ${n === 1 ? "sale" : "sales"}`;

// Total sales, then project / brokerage / rental — every category for the same dates and status, whichever one is picked.
export default function SalesTotals({ totals, category, onPick }: SalesTotalsProps) {
    const rows = ORDER.map((c) => totals.find((t) => t.category === c) ?? { category: c, sales: 0, value: 0 });
    const all = rows.reduce((sum, r) => ({ sales: sum.sales + r.sales, value: sum.value + r.value }), { sales: 0, value: 0 });
    const tiles = [{ key: "", label: "Total sales", ...all }, ...rows.map((r) => ({ key: r.category, label: CATEGORY_LABELS[r.category] ?? r.category, sales: r.sales, value: r.value }))];

    return (
        <Grid container spacing={2} sx={{ mb: 3 }}>
            {tiles.map((t) => {
                const selected = (category ?? "") === t.key;
                return (
                    <Grid key={t.key || "all"} size={{ xs: 12, sm: 6, lg: 3 }}>
                        <ButtonBase
                            onClick={() => onPick(t.key)}
                            aria-pressed={selected}
                            sx={{
                                width: "100%",
                                height: "100%",
                                display: "block",
                                textAlign: "left",
                                // Lets the amount size itself to the tile's width (cqi below).
                                containerType: "inline-size",
                                p: 2.5,
                                borderRadius: 3,
                                border: "1px solid",
                                borderColor: selected ? "var(--lr-primary)" : "var(--lr-border)",
                                backgroundColor: selected ? "var(--lr-primary-soft)" : "var(--lr-surface)",
                                transition: "border-color 0.15s, background-color 0.15s",
                                "&:hover": { borderColor: "var(--lr-primary)" },
                            }}
                        >
                            <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", fontWeight: 500 }}>
                                {t.label}
                            </Typography>
                            <Typography
                                fontFamily="Google Sans Code"
                                title={formatPeso(t.value)}
                                sx={{ mt: 1, fontSize: "clamp(15px, 8.5cqi, 26px)", lineHeight: 1.15, color: "var(--lr-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                            >
                                {formatPeso(t.value)}
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                                <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                                    {salesWord(t.sales)}
                                </Typography>
                            </Box>
                        </ButtonBase>
                    </Grid>
                );
            })}
        </Grid>
    );
}
