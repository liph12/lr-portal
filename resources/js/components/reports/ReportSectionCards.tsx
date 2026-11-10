import { ElementType } from "react";
import { Box, ButtonBase, Grid, Typography } from "@mui/material";

export interface ReportSection {
    value: string;
    label: string;
    icon: ElementType;
    // A small figure under the label (e.g. a total), when it's already at hand.
    detail?: string;
}

interface ReportSectionCardsProps {
    sections: ReportSection[];
    active: string;
    onSelect: (value: string) => void;
    "aria-label": string;
}

// A row of big, clickable cards — one per view a report can show (or "Statistics") — so only the one picked renders
// below: no more scrolling past a table and every chart at once to find either.
export default function ReportSectionCards({ sections, active, onSelect, "aria-label": ariaLabel }: ReportSectionCardsProps) {
    return (
        <Box role="tablist" aria-label={ariaLabel} sx={{ mb: 3 }}>
            <Grid container spacing={1.5}>
                {sections.map((s) => {
                    const isActive = s.value === active;
                    return (
                        <Grid key={s.value} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                            <ButtonBase
                                role="tab"
                                aria-selected={isActive}
                                onClick={() => onSelect(s.value)}
                                sx={{
                                    width: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    textAlign: "center",
                                    gap: 0.75,
                                    p: 2,
                                    borderRadius: 3,
                                    border: "1px solid",
                                    borderColor: isActive ? "var(--lr-primary)" : "var(--lr-border)",
                                    backgroundColor: isActive ? "var(--lr-primary-soft)" : "var(--lr-surface)",
                                    boxShadow: isActive ? "none" : "var(--lr-shadow)",
                                    transition: "border-color 0.15s ease, background-color 0.15s ease",
                                    ":hover": { borderColor: "var(--lr-primary)", backgroundColor: isActive ? "var(--lr-primary-soft)" : "var(--lr-surface-hover)" },
                                }}
                            >
                                <s.icon sx={{ fontSize: 26, color: isActive ? "var(--lr-primary)" : "var(--lr-text-secondary)" }} />
                                <Typography variant="body2" sx={{ fontWeight: isActive ? 600 : 500, color: isActive ? "var(--lr-primary)" : "var(--lr-text-primary)" }}>
                                    {s.label}
                                </Typography>
                                {s.detail && (
                                    <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                                        {s.detail}
                                    </Typography>
                                )}
                            </ButtonBase>
                        </Grid>
                    );
                })}
            </Grid>
        </Box>
    );
}
