import { ReactNode } from "react";
import { Box, Grid, Typography } from "@mui/material";
import { ChevronRightRounded } from "@mui/icons-material";
import { Link } from "@inertiajs/react";
import ManagementLayout from "../../../components/layouts/ManagementLayout";
import StatusChip from "../../../components/utils/StatusChip";
import SpotIcon from "../../../components/utils/SpotIcon";
import useAuthUser from "../../../hooks/useAuthUser";
import { hasAnyPermission } from "../../../helpers/permissions";
import { formatCount } from "../../../helpers/formatNumber";
import { MANAGEMENT_SECTIONS } from "../../../components/management/managementCatalog";

interface ManagementProps {
    // Null without the Management permissions (a receiving-only reader).
    counts: { agents: number; teams: number; sub_teams: number; transfers: number } | null;
}

// Management: one card per section the reader may open, with what's in it now; the receivings count what's waiting.
function Management({ counts }: ManagementProps) {
    const user = useAuthUser();
    const base = `/${user?.portal ?? "superadmin"}/management`;
    const awaiting = user?.commission_receiving;

    // The line under each card: how much is there, and for the receivings how much is waiting (amber when any).
    const figure = (name: string): { text: string; waiting?: boolean } | null => {
        switch (name) {
            case "Agents":
                return counts && { text: `${formatCount(counts.agents)} on a team` };
            case "Teams":
                return counts && { text: `${formatCount(counts.teams)} active` };
            case "Sub-teams":
                return counts && { text: `${formatCount(counts.sub_teams)} active` };
            case "Team transfers":
                return counts && { text: `${formatCount(counts.transfers)} this month` };
            case "Brokerage receiving":
                return { text: `${formatCount(awaiting?.brokerage ?? 0)} awaiting`, waiting: (awaiting?.brokerage ?? 0) > 0 };
            case "Rental receiving":
                return { text: `${formatCount(awaiting?.rental ?? 0)} awaiting`, waiting: (awaiting?.rental ?? 0) > 0 };
            case "SMS Manager":
                return user?.sms_credits ? { text: `${formatCount(user.sms_credits.pending)} credit requests waiting`, waiting: user.sms_credits.pending > 0 } : null;
            default:
                return null;
        }
    };

    return (
        <Grid container spacing={2}>
            {MANAGEMENT_SECTIONS.filter((s) => hasAnyPermission(user?.permissions, s.permission)).map((section) => {
                const shown = figure(section.name);

                return (
                    <Grid key={section.name} size={{ xs: 12, sm: 6, lg: 4 }}>
                        <Link href={section.href(base)} style={{ textDecoration: "none", display: "block", height: "100%" }}>
                            <Box
                                sx={{
                                    height: "100%",
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: 2,
                                    p: 2.5,
                                    border: "1px solid var(--lr-border)",
                                    borderRadius: 3,
                                    backgroundColor: "var(--lr-surface)",
                                    transition: "box-shadow 0.2s ease",
                                    ":hover": { boxShadow: "0 1px 3px rgba(60,64,67,.15), 0 4px 8px rgba(60,64,67,.1)" },
                                }}
                            >
                                <SpotIcon name={section.art} size={52} />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body1" sx={{ fontWeight: 500, color: "var(--lr-text-primary)" }}>
                                        {section.name}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", mt: 0.5 }}>
                                        {section.description}
                                    </Typography>
                                    {shown && (
                                        <StatusChip status={shown.waiting ? "pending" : "inactive"} sx={{ mt: 1.25, textTransform: "none" }}>
                                            {shown.text}
                                        </StatusChip>
                                    )}
                                </Box>
                                <ChevronRightRounded sx={{ color: "var(--lr-text-secondary)", alignSelf: "center" }} />
                            </Box>
                        </Link>
                    </Grid>
                );
            })}
        </Grid>
    );
}

Management.layout = (page: ReactNode) => <ManagementLayout children={page} />;

export default Management;
