import { Box, Tooltip, Typography } from "@mui/material";
import { srOnly } from "./srOnly";

export interface BarListItem {
    name: string;
    value: number;
    // Secondary figure shown beside the label, e.g. "3 sales".
    detail?: string;
    tooltip?: string;
}

interface BarListProps {
    items: BarListItem[];
    caption: string;
    formatValue: (value: number) => string;
    emptyText: string;
}

// Ranked horizontal bars in one hue: the job is comparing magnitude, so colour stays constant.
export default function BarList({ items, caption, formatValue, emptyText }: BarListProps) {
    const max = Math.max(...items.map((i) => i.value), 0);

    if (items.length === 0 || max === 0) {
        return (
            <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", py: 3, textAlign: "center" }}>
                {emptyText}
            </Typography>
        );
    }

    return (
        <Box component="figure" sx={{ m: 0 }}>
            <Box component="ol" aria-hidden sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
                {items.map((item) => (
                    <Tooltip key={item.name} title={item.tooltip ?? ""} placement="top-start" disableHoverListener={!item.tooltip}>
                        <Box component="li">
                            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mb: 0.5 }}>
                                <Typography
                                    variant="body2"
                                    sx={{ color: "var(--lr-text-body)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}
                                >
                                    {item.name}
                                    {item.detail && (
                                        <Typography component="span" variant="caption" sx={{ color: "var(--lr-text-secondary)", ml: 0.75, fontWeight: 400 }}>
                                            {item.detail}
                                        </Typography>
                                    )}
                                </Typography>
                                <Typography variant="body2" fontFamily="Google Sans Code" sx={{ color: "var(--lr-text-primary)", flexShrink: 0 }}>
                                    {formatValue(item.value)}
                                </Typography>
                            </Box>
                            <Box sx={{ height: 8, borderRadius: 99, backgroundColor: "var(--lr-surface-container)" }}>
                                <Box
                                    sx={{
                                        height: "100%",
                                        width: `${(item.value / max) * 100}%`,
                                        minWidth: 4,
                                        borderRadius: 99,
                                        backgroundColor: "var(--lr-series-1)",
                                        transition: "width 0.25s ease",
                                    }}
                                />
                            </Box>
                        </Box>
                    </Tooltip>
                ))}
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
