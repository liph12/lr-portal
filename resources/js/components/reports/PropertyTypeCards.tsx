import { useState } from "react";
import { Box, Collapse, Grid, Typography } from "@mui/material";
import { ExpandMoreRounded } from "@mui/icons-material";
import { formatCount, formatPesoCompact, formatPesoExact } from "../../helpers/formatNumber";

export interface PropertyTypeCardItem {
    id: number;
    name: string;
    sales: number;
    value: number;
    // Total value ÷ total floor area, only sales with one recorded — null when none of this group's sales has one.
    price_per_sqm: number | null;
    unit_types: { name: string; sales: number; value: number; price_per_sqm: number | null }[];
}

interface PropertyTypeCardsProps {
    items: PropertyTypeCardItem[];
    // Clicking a sub-type row inside an expanded card narrows the whole report to that property type + unit type.
    onUnitTypeClick?: (propertyTypeId: number, unitType: string) => void;
    emptyText: string;
}

const unitsWord = (n: number) => `${formatCount(n)} ${n === 1 ? "unit" : "units"}`;

// Property types as cards (total sales, total units), each expandable in place to its own unit-type breakdown
// (condo → studio, 1BR, 2BR…) — no second request, no navigation; narrowing the report happens one level down,
// by clicking a specific unit type.
export default function PropertyTypeCards({ items, onUnitTypeClick, emptyText }: PropertyTypeCardsProps) {
    const [expanded, setExpanded] = useState<Set<number>>(new Set());

    if (items.length === 0) {
        return (
            <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", py: 3, textAlign: "center" }}>
                {emptyText}
            </Typography>
        );
    }

    const toggle = (id: number) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    return (
        <Grid container spacing={2}>
            {items.map((item) => {
                const isOpen = expanded.has(item.id);
                const canExpand = item.unit_types.length > 0;
                const panelId = `property-type-${item.id}-units`;

                return (
                    <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4 }}>
                        <Box sx={{ border: "1px solid var(--lr-border)", borderRadius: 3, backgroundColor: "var(--lr-surface)", overflow: "hidden", height: "100%" }}>
                            <Box
                                component={canExpand ? "button" : "div"}
                                type={canExpand ? "button" : undefined}
                                onClick={canExpand ? () => toggle(item.id) : undefined}
                                aria-expanded={canExpand ? isOpen : undefined}
                                aria-controls={canExpand ? panelId : undefined}
                                sx={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.5,
                                    p: 2,
                                    border: 0,
                                    background: "none",
                                    font: "inherit",
                                    textAlign: "left",
                                    cursor: canExpand ? "pointer" : "default",
                                    ":hover": canExpand ? { backgroundColor: "var(--lr-surface-hover)" } : undefined,
                                }}
                            >
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography sx={{ fontWeight: 600, color: "var(--lr-text-primary)", overflowWrap: "anywhere" }}>{item.name}</Typography>
                                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 0.5 }}>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)", display: "block" }}>
                                                Total sales
                                            </Typography>
                                            <Typography sx={{ fontWeight: 500, color: "var(--lr-text-primary)" }}>{formatPesoCompact(item.value)}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)", display: "block" }}>
                                                Total units
                                            </Typography>
                                            <Typography sx={{ fontWeight: 500, color: "var(--lr-text-primary)" }}>{formatCount(item.sales)}</Typography>
                                        </Box>
                                        {item.price_per_sqm !== null && (
                                            <Box>
                                                <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)", display: "block" }}>
                                                    Avg. price / sqm
                                                </Typography>
                                                <Typography sx={{ fontWeight: 500, color: "var(--lr-text-primary)" }}>{formatPesoExact(item.price_per_sqm)}</Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                                {canExpand && (
                                    <ExpandMoreRounded
                                        sx={{ color: "var(--lr-text-secondary)", flexShrink: 0, transition: "transform 0.2s ease", transform: isOpen ? "rotate(180deg)" : "none" }}
                                    />
                                )}
                            </Box>
                            {canExpand && (
                                <Collapse in={isOpen} id={panelId}>
                                    <Box sx={{ borderTop: "1px solid var(--lr-border)", px: 2, py: 1 }}>
                                        {item.unit_types.map((u) => (
                                            <Box
                                                key={u.name}
                                                component={onUnitTypeClick ? "button" : "div"}
                                                type={onUnitTypeClick ? "button" : undefined}
                                                onClick={onUnitTypeClick ? () => onUnitTypeClick(item.id, u.name) : undefined}
                                                sx={{
                                                    width: "100%",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    gap: 1,
                                                    py: 1,
                                                    border: 0,
                                                    background: "none",
                                                    font: "inherit",
                                                    textAlign: "left",
                                                    cursor: onUnitTypeClick ? "pointer" : "default",
                                                    borderBottom: "1px solid var(--lr-border)",
                                                    ":last-of-type": { borderBottom: 0 },
                                                    ":hover": onUnitTypeClick ? { color: "var(--lr-primary)" } : undefined,
                                                }}
                                            >
                                                <Typography variant="body2" sx={{ color: "inherit" }}>
                                                    {u.name}
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", flexShrink: 0 }}>
                                                    {unitsWord(u.sales)} · {formatPesoCompact(u.value)}
                                                    {u.price_per_sqm !== null && ` · ${formatPesoExact(u.price_per_sqm)}/sqm`}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </Collapse>
                            )}
                        </Box>
                    </Grid>
                );
            })}
        </Grid>
    );
}
