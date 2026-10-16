import { ElementType } from "react";
import { Box, Typography } from "@mui/material";
import { ArrowDownwardRounded, ArrowUpwardRounded, RemoveRounded } from "@mui/icons-material";
import { percentChange } from "../../helpers/formatNumber";
import { fitFontSize } from "../../helpers/fitText";
import { srOnly } from "./srOnly";

interface StatTileProps {
    label: string;
    value: string;
    current?: number;
    previous?: number | null;
    // Shown instead of a change when there's no previous period (e.g. "of 5 users").
    caption?: string;
    comparisonLabel?: string;
    // A large, faint icon behind the figures (what the tile counts).
    icon?: ElementType;
}

export default function StatTile({ label, value, current, previous, caption, comparisonLabel = "vs previous period", icon: Icon }: StatTileProps) {
    const change = current !== undefined ? percentChange(current, previous) : null;
    const direction = change === null ? null : change > 0 ? "up" : change < 0 ? "down" : "flat";
    const tone =
        direction === "up"
            ? { color: "var(--lr-success)", bg: "var(--lr-success-soft)", Icon: ArrowUpwardRounded, word: "up" }
            : direction === "down"
              ? { color: "var(--lr-error)", bg: "var(--lr-error-soft)", Icon: ArrowDownwardRounded, word: "down" }
              : { color: "var(--lr-text-secondary)", bg: "var(--lr-surface-container)", Icon: RemoveRounded, word: "no change" };

    return (
        <Box
            sx={{
                position: "relative",
                overflow: "hidden",
                // The figure sizes itself to this card's width (fitFontSize).
                containerType: "inline-size",
                height: "100%",
                p: 2.5,
                borderRadius: 3,
                border: "1px solid var(--lr-border)",
                backgroundColor: "var(--lr-surface)",
                // The figures sit above the watermark icon.
                "& > :not(.stat-tile-icon)": { position: "relative" },
            }}
        >
            {Icon && <Icon className="stat-tile-icon" aria-hidden sx={{ position: "absolute", right: -14, bottom: -18, fontSize: 112, color: "var(--lr-primary)", opacity: 0.07, pointerEvents: "none" }} />}
            <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", fontWeight: 500 }}>
                {label}
            </Typography>
            <Typography
                fontFamily="Google Sans Code"
                // Always one line: whole amounts to the centavo (₱35,737,795,092.47) shrink to the card's width.
                sx={{ mt: 1, fontSize: fitFontSize(value, 30), lineHeight: 1.15, color: "var(--lr-text-primary)", whiteSpace: "nowrap" }}
            >
                {value}
            </Typography>
            <Box sx={{ mt: 1.25, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", minHeight: 22 }}>
                {direction ? (
                    <>
                        <Box
                            component="span"
                            sx={{ display: "inline-flex", alignItems: "center", gap: 0.25, px: 0.75, py: 0.125, borderRadius: 99, color: tone.color, backgroundColor: tone.bg }}
                        >
                            <tone.Icon sx={{ fontSize: 14 }} aria-hidden />
                            <Typography component="span" variant="caption" sx={{ fontWeight: 500 }}>
                                {change === 0 ? "0%" : `${Math.abs(change ?? 0)}%`}
                                <Box component="span" sx={srOnly}>
                                    {" "}
                                    {tone.word}
                                </Box>
                            </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                            {comparisonLabel}
                        </Typography>
                    </>
                ) : (
                    <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                        {caption ?? "No earlier period to compare"}
                    </Typography>
                )}
            </Box>
        </Box>
    );
}
