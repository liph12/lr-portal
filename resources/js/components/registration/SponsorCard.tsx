import { Box, Typography } from "@mui/material";
import UserAvatar from "../utils/user/UserAvatar";

export interface Sponsor {
    id: number;
    name: string;
    avatar: string | null;
    branch: string | null;
    team: string | null;
    sub_team: string | null;
}

// The sponsor / upline a referral link points to: who the new agent is confirming, and the team they'll join with them.
export default function SponsorCard({ sponsor }: { sponsor: Sponsor }) {
    const where = [sponsor.team, sponsor.sub_team].filter(Boolean).join(" / ");

    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, p: 2, borderRadius: 3, border: "1px solid var(--lr-border)", backgroundColor: "var(--lr-surface-container)" }}>
            <UserAvatar name={sponsor.name} src={sponsor.avatar} size={56} />
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)", fontWeight: 500, letterSpacing: 0.3 }}>
                    YOUR SPONSOR / UPLINE
                </Typography>
                <Typography sx={{ fontWeight: 500, color: "var(--lr-text-primary)", fontSize: 17 }}>{sponsor.name}</Typography>
                <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                    {[sponsor.branch && `${sponsor.branch} branch`, where && `You'll join ${where}`].filter(Boolean).join(" · ") || `Member #${sponsor.id}`}
                </Typography>
            </Box>
        </Box>
    );
}
