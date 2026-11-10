import { Box, Typography } from "@mui/material";
import { ChevronRightRounded, CloseRounded } from "@mui/icons-material";
import StyledButton from "../utils/StyledButton";
import UserAvatar from "../utils/user/UserAvatar";
import { formatPesoCompact } from "../../helpers/formatNumber";

export interface ReportScopeDetails {
    type: "team" | "sub_team" | "developer" | "area" | "agent" | "property_type" | "project" | "unit_type";
    id: number | string;
    name: string;
    avatar: string | null;
    facts: { label: string; value: string }[];
}

interface ReportScopeHeaderProps {
    // One level (most readers — a locked reader's own group), or the whole drill-down trail broadest first
    // (SalesReportService::scopeTrail — a developer, then a property type within it, combine). The big banner below
    // always names the last one; onNavigate jumps back to an earlier one.
    scope: ReportScopeDetails | ReportScopeDetails[];
    // Total sales in this group for the current filters.
    total: number;
    // Omitted when the scope is fixed (My Team): no "Show everyone".
    onClear?: () => void;
    // Clicking an earlier level in the trail: clears everything narrower than it, keeping it and anything broader.
    onNavigate?: (type: ReportScopeDetails["type"]) => void;
    // For pages that aren't about sales (e.g. the recruits overview).
    hideTotal?: boolean;
    // Overrides the small label above the name (e.g. "Sponsor / upline").
    typeLabel?: string;
}

const TYPE_LABELS: Record<ReportScopeDetails["type"], string> = {
    team: "Team",
    sub_team: "Sub-team",
    developer: "Developer",
    area: "Branch",
    agent: "Your sales",
    property_type: "Property type",
    project: "Project",
    unit_type: "Unit type",
};

// Big, unmistakable banner for the group a report is narrowed to (after clicking a team, area, developer…), with a
// breadcrumb above it when more than one level combines — so it's clear a developer AND a property type are both active,
// not just whichever one the banner happens to feature.
export default function ReportScopeHeader({ scope, total, onClear, onNavigate, hideTotal = false, typeLabel }: ReportScopeHeaderProps) {
    const trail = Array.isArray(scope) ? scope : [scope];
    if (trail.length === 0) return null;
    const current = trail[trail.length - 1];
    const breadcrumb = trail.slice(0, -1);

    return (
        <Box sx={{ mb: 3 }}>
            {breadcrumb.length > 0 && (
                <Box aria-label="Drill-down trail" sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.5, mb: 1, px: 0.5 }}>
                    {breadcrumb.map((level) => (
                        <Box key={`${level.type}-${level.id}`} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            {onNavigate ? (
                                <Box
                                    component="button"
                                    type="button"
                                    onClick={() => onNavigate(level.type)}
                                    sx={{
                                        border: 0,
                                        background: "none",
                                        p: 0,
                                        font: "inherit",
                                        cursor: "pointer",
                                        color: "var(--lr-primary)",
                                        fontSize: 13,
                                        fontWeight: 500,
                                        textDecoration: "underline",
                                        textUnderlineOffset: 2,
                                    }}
                                >
                                    {level.name}
                                </Box>
                            ) : (
                                <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)", fontWeight: 500 }}>
                                    {level.name}
                                </Typography>
                            )}
                            <ChevronRightRounded sx={{ fontSize: 16, color: "var(--lr-text-secondary)" }} />
                        </Box>
                    ))}
                    <Typography variant="caption" sx={{ color: "var(--lr-text-primary)", fontWeight: 600 }}>
                        {current.name}
                    </Typography>
                </Box>
            )}
            <Box
                component="section"
                aria-label={`Showing ${TYPE_LABELS[current.type].toLowerCase()} ${current.name}`}
                sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: { xs: 2, sm: 3 },
                    p: { xs: 2, sm: 3 },
                    borderRadius: 4,
                    border: "1px solid var(--lr-border)",
                    backgroundColor: "var(--lr-primary-soft)",
                }}
            >
                <UserAvatar name={current.name} src={current.avatar} size={72} />
                <Box sx={{ flex: "1 1 260px", minWidth: 0 }}>
                    <Typography variant="overline" sx={{ color: "var(--lr-primary)", fontWeight: 600, letterSpacing: 1 }}>
                        {typeLabel ?? TYPE_LABELS[current.type]}
                    </Typography>
                    <Typography sx={{ fontSize: { xs: 24, sm: 30 }, fontWeight: 500, lineHeight: 1.2, color: "var(--lr-text-primary)", overflowWrap: "anywhere" }}>
                        {current.name}
                    </Typography>
                    {current.facts.length > 0 && (
                        <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 3, rowGap: 0.5, mt: 1 }}>
                            {current.facts.map((f) => (
                                <Typography key={f.label} variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                                    {f.label}: <Box component="span" sx={{ color: "var(--lr-text-primary)", fontWeight: 500 }}>{f.value}</Box>
                                </Typography>
                            ))}
                        </Box>
                    )}
                </Box>
                <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
                    {!hideTotal && (
                        <>
                            <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                                Total sales
                            </Typography>
                            <Typography sx={{ fontSize: { xs: 24, sm: 30 }, fontWeight: 500, color: "var(--lr-text-primary)" }}>{formatPesoCompact(total)}</Typography>
                        </>
                    )}
                    {onClear && (
                        <StyledButton size="small" variant="text" startIcon={<CloseRounded />} onClick={onClear} sx={{ mt: 0.5, px: 1, color: "var(--lr-primary)" }}>
                            Show everyone
                        </StyledButton>
                    )}
                </Box>
            </Box>
        </Box>
    );
}
