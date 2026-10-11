import { Box, Typography } from "@mui/material";
import { CloseRounded } from "@mui/icons-material";
import StyledButton from "../utils/StyledButton";
import UserAvatar from "../utils/user/UserAvatar";
import { formatPesoCompact } from "../../helpers/formatNumber";

export interface ReportScopeDetails {
    type: "team" | "sub_team" | "developer" | "area" | "agent";
    id: number | string;
    name: string;
    avatar: string | null;
    facts: { label: string; value: string }[];
}

interface ReportScopeHeaderProps {
    scope: ReportScopeDetails;
    // Total sales in this group for the current filters.
    total: number;
    // Omitted when the scope is fixed (My Team): no "Show everyone".
    onClear?: () => void;
    // For pages that aren't about sales (e.g. the recruits overview).
    hideTotal?: boolean;
    // Overrides the small label above the name (e.g. "Sponsor / upline").
    typeLabel?: string;
}

const TYPE_LABELS: Record<ReportScopeDetails["type"], string> = {
    team: "Team",
    sub_team: "Sub-team",
    developer: "Developer",
    area: "Area",
    agent: "Your sales",
};

// Big, unmistakable banner for the group a report is narrowed to (after clicking a team, area, developer…).
export default function ReportScopeHeader({ scope, total, onClear, hideTotal = false, typeLabel }: ReportScopeHeaderProps) {
    return (
        <Box
            component="section"
            aria-label={`Showing ${TYPE_LABELS[scope.type].toLowerCase()} ${scope.name}`}
            sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: { xs: 2, sm: 3 },
                p: { xs: 2, sm: 3 },
                mb: 3,
                borderRadius: 4,
                border: "1px solid var(--lr-border)",
                backgroundColor: "var(--lr-primary-soft)",
            }}
        >
            <UserAvatar name={scope.name} src={scope.avatar} size={72} />
            <Box sx={{ flex: "1 1 260px", minWidth: 0 }}>
                <Typography variant="overline" sx={{ color: "var(--lr-primary)", fontWeight: 600, letterSpacing: 1 }}>
                    {typeLabel ?? TYPE_LABELS[scope.type]}
                </Typography>
                <Typography sx={{ fontSize: { xs: 24, sm: 30 }, fontWeight: 500, lineHeight: 1.2, color: "var(--lr-text-primary)", overflowWrap: "anywhere" }}>
                    {scope.name}
                </Typography>
                {scope.facts.length > 0 && (
                    <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 3, rowGap: 0.5, mt: 1 }}>
                        {scope.facts.map((f) => (
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
    );
}
