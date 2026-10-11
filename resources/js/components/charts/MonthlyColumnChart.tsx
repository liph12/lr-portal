import { useMemo, useState } from "react";
import { Box, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material";
import { formatCount, formatMonth, formatPeso, formatPesoCompact } from "../../helpers/formatNumber";
import { srOnly } from "./srOnly";

interface MonthPoint {
    month: string;
    sales: number;
    value: number;
}

type Metric = "value" | "sales";

const PLOT_HEIGHT = 200;

// Round the axis top up to a "nice" number so gridlines land on readable values.
function niceMax(max: number): number {
    if (max <= 0) return 1;
    const magnitude = 10 ** Math.floor(Math.log10(max));
    const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= max) ?? 10;
    return step * magnitude;
}

interface MonthlyColumnChartProps {
    data: MonthPoint[];
    // "year" for long ranges: `month` is then "YYYY-01" and bars are labelled by year.
    bucket?: "month" | "year";
    // Wording for when `sales` / `value` mean something else (e.g. recruits and their sales).
    labels?: { value: string; count: string; valueToggle: string; countToggle: string; dated: string };
}

const DEFAULT_LABELS = {
    value: "Total contract value",
    count: "Sales recorded",
    valueToggle: "Contract value",
    countToggle: "Sales count",
    dated: "by reservation date",
};

export default function MonthlyColumnChart({ data, bucket = "month", labels = DEFAULT_LABELS }: MonthlyColumnChartProps) {
    const label = (month: string, style: "short" | "long") => (bucket === "year" ? month.slice(0, 4) : formatMonth(month, style));
    const [metric, setMetric] = useState<Metric>("value");
    const format = (n: number) => (metric === "value" ? formatPesoCompact(n) : formatCount(n));

    const max = useMemo(() => niceMax(Math.max(...data.map((d) => d[metric]), 0)), [data, metric]);
    const ticks = [max, max / 2, 0];
    // With many months, label every third so x labels never collide.
    const labelEvery = data.length > 18 ? 3 : data.length > 12 ? 2 : 1;
    const total = data.reduce((sum, d) => sum + d[metric], 0);

    return (
        <Box component="figure" sx={{ m: 0 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
                <Typography component="figcaption" variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                    {metric === "value" ? labels.value : labels.count} per {bucket}, {labels.dated}
                </Typography>
                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={metric}
                    onChange={(_, v: Metric | null) => v && setMetric(v)}
                    aria-label="Chart measure"
                    sx={{ "& .MuiToggleButton-root": { textTransform: "none", px: 1.5, py: 0.25, fontSize: 12, borderColor: "var(--lr-border)" } }}
                >
                    <ToggleButton value="value">{labels.valueToggle}</ToggleButton>
                    <ToggleButton value="sales">{labels.countToggle}</ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {total === 0 ? (
                <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", py: 6, textAlign: "center" }}>
                    No sales recorded in this period yet.
                </Typography>
            ) : (
                <Box sx={{ display: "flex", gap: 1 }} aria-hidden>
                    {/* y axis: recessive ticks only */}
                    <Box sx={{ position: "relative", width: 52, height: PLOT_HEIGHT, flexShrink: 0 }}>
                        {ticks.map((t) => (
                            <Typography
                                key={t}
                                variant="caption"
                                sx={{
                                    position: "absolute",
                                    right: 0,
                                    top: `${(1 - t / max) * 100}%`,
                                    transform: "translateY(-50%)",
                                    fontSize: 11,
                                    color: "var(--lr-text-secondary)",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {format(t)}
                            </Typography>
                        ))}
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ position: "relative", height: PLOT_HEIGHT }}>
                            {ticks.map((t) => (
                                <Box
                                    key={t}
                                    sx={{
                                        position: "absolute",
                                        left: 0,
                                        right: 0,
                                        top: `${(1 - t / max) * 100}%`,
                                        borderTop: "1px solid",
                                        borderColor: t === 0 ? "var(--lr-border)" : "var(--lr-chart-grid)",
                                    }}
                                />
                            ))}
                            <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", gap: "2px" }}>
                                {data.map((d) => (
                                    <Tooltip
                                        key={d.month}
                                        placement="top"
                                        title={
                                            <Box>
                                                <Box sx={{ fontWeight: 600 }}>{label(d.month, "long")}</Box>
                                                <Box>{formatPeso(d.value)}</Box>
                                                <Box>
                                                    {d.sales} {d.sales === 1 ? "sale" : "sales"}
                                                </Box>
                                            </Box>
                                        }
                                    >
                                        {/* Full-height hit area so thin or empty months are still easy to hover. */}
                                        <Box sx={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", cursor: "default", ":hover > div": { opacity: 0.8 } }}>
                                            <Box
                                                sx={{
                                                    width: "70%",
                                                    maxWidth: 28,
                                                    height: `${(d[metric] / max) * 100}%`,
                                                    minHeight: d[metric] > 0 ? 3 : 0,
                                                    borderRadius: "4px 4px 0 0",
                                                    backgroundColor: "var(--lr-series-1)",
                                                    transition: "height 0.25s ease",
                                                }}
                                            />
                                        </Box>
                                    </Tooltip>
                                ))}
                            </Box>
                        </Box>
                        <Box sx={{ display: "flex", gap: "2px", mt: 0.75 }}>
                            {data.map((d, i) => (
                                <Typography
                                    key={d.month}
                                    variant="caption"
                                    sx={{ flex: 1, textAlign: "center", fontSize: 11, color: "var(--lr-text-secondary)", overflow: "hidden", whiteSpace: "nowrap" }}
                                >
                                    {i % labelEvery === 0 ? label(d.month, "short") : ""}
                                </Typography>
                            ))}
                        </Box>
                    </Box>
                </Box>
            )}

            <Box component="table" sx={srOnly}>
                <caption>
                    {labels.count} and {labels.value.toLowerCase()} per {bucket}
                </caption>
                <thead>
                    <tr>
                        <th scope="col">{bucket === "year" ? "Year" : "Month"}</th>
                        <th scope="col">{labels.countToggle}</th>
                        <th scope="col">{labels.valueToggle}</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((d) => (
                        <tr key={d.month}>
                            <th scope="row">{label(d.month, "long")}</th>
                            <td>{d.sales}</td>
                            <td>{formatPeso(d.value)}</td>
                        </tr>
                    ))}
                </tbody>
            </Box>
        </Box>
    );
}
