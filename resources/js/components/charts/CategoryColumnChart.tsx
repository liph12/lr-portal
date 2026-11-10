import { Box, Tooltip, Typography } from "@mui/material";
import { Link } from "@inertiajs/react";
import { srOnly } from "./srOnly";

export interface CategoryColumnItem {
    name: string;
    value: number;
    // Secondary figure shown in the tooltip and the screen-reader table, e.g. "3 sales".
    detail?: string;
    tooltip?: string;
    // Makes the column a link (e.g. narrowing a report to it).
    href?: string;
    // Or a client-side narrowing (e.g. a server-paged table's drillInto), when there's no plain URL for it.
    onClick?: () => void;
}

interface CategoryColumnChartProps {
    items: CategoryColumnItem[];
    caption: string;
    formatValue: (value: number) => string;
    emptyText: string;
}

const PLOT_HEIGHT = 200;
// Cycles the three validated series tokens so each category reads as its own colour, not one ranked hue.
const COLORS = ["var(--lr-series-1)", "var(--lr-series-2)", "var(--lr-series-3)"];

// Round the axis top up to a "nice" number so gridlines land on readable values.
function niceMax(max: number): number {
    if (max <= 0) return 1;
    const magnitude = 10 ** Math.floor(Math.log10(max));
    const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= max) ?? 10;
    return step * magnitude;
}

// A handful of named categories as coloured vertical columns — comparing by category, property type, age band, and
// the like. A long ranked list (Top agents, Top developers) stays a BarList instead.
export default function CategoryColumnChart({ items, caption, formatValue, emptyText }: CategoryColumnChartProps) {
    const max = niceMax(Math.max(...items.map((i) => i.value), 0));
    const ticks = [max, max / 2, 0];

    if (items.length === 0 || max === 0) {
        return (
            <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", py: 3, textAlign: "center" }}>
                {emptyText}
            </Typography>
        );
    }

    return (
        <Box component="figure" sx={{ m: 0 }}>
            <Box sx={{ display: "flex", gap: 1 }} aria-hidden>
                {/* y axis: recessive ticks only */}
                <Box sx={{ position: "relative", width: 52, height: PLOT_HEIGHT, flexShrink: 0 }}>
                    {ticks.map((t) => (
                        <Typography
                            key={t}
                            variant="caption"
                            sx={{ position: "absolute", right: 0, top: `${(1 - t / max) * 100}%`, transform: "translateY(-50%)", fontSize: 11, color: "var(--lr-text-secondary)", whiteSpace: "nowrap" }}
                        >
                            {formatValue(t)}
                        </Typography>
                    ))}
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ position: "relative", height: PLOT_HEIGHT }}>
                        {ticks.map((t) => (
                            <Box
                                key={t}
                                sx={{ position: "absolute", left: 0, right: 0, top: `${(1 - t / max) * 100}%`, borderTop: "1px solid", borderColor: t === 0 ? "var(--lr-border)" : "var(--lr-chart-grid)" }}
                            />
                        ))}
                        <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", gap: 1.5, px: 0.5 }}>
                            {items.map((item, i) => {
                                const bar = (
                                    <Box
                                        sx={{
                                            width: "100%",
                                            maxWidth: 56,
                                            height: `${(item.value / max) * 100}%`,
                                            minHeight: item.value > 0 ? 3 : 0,
                                            borderRadius: "4px 4px 0 0",
                                            backgroundColor: COLORS[i % COLORS.length],
                                            transition: "height 0.25s ease",
                                        }}
                                    />
                                );

                                const wrapperSx = { display: "flex", alignItems: "flex-end", height: "100%", width: "100%", justifyContent: "center", textDecoration: "none", border: 0, background: "none", padding: 0, font: "inherit" };

                                return (
                                    <Tooltip key={item.name} placement="top" title={item.tooltip ?? `${item.name}: ${formatValue(item.value)}${item.detail ? ` · ${item.detail}` : ""}`}>
                                        <Box sx={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", ":hover > div, :hover > a > div, :hover > button > div": { opacity: 0.8 } }}>
                                            {item.href ? (
                                                <Box component={Link} href={item.href} preserveScroll sx={wrapperSx}>
                                                    {bar}
                                                </Box>
                                            ) : item.onClick ? (
                                                <Box component="button" type="button" onClick={item.onClick} sx={{ ...wrapperSx, cursor: "pointer" }}>
                                                    {bar}
                                                </Box>
                                            ) : (
                                                bar
                                            )}
                                        </Box>
                                    </Tooltip>
                                );
                            })}
                        </Box>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1.5, mt: 0.75, px: 0.5 }}>
                        {items.map((item) => (
                            <Typography
                                key={item.name}
                                variant="caption"
                                sx={{ flex: 1, textAlign: "center", fontSize: 11, color: "var(--lr-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                            >
                                {item.name}
                            </Typography>
                        ))}
                    </Box>
                </Box>
            </Box>

            <Box component="table" sx={srOnly}>
                <caption>{caption}</caption>
                <tbody>
                    {items.map((item) => (
                        <tr key={item.name}>
                            <th scope="row">{item.name}</th>
                            <td>{formatValue(item.value)}</td>
                            <td>{item.detail}</td>
                        </tr>
                    ))}
                </tbody>
            </Box>
        </Box>
    );
}
