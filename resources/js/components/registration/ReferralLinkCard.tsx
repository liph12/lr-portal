import { Box, Typography } from "@mui/material";
import { ContentCopyRounded } from "@mui/icons-material";
import SectionCard from "../cards/SectionCard";
import StyledButton from "../utils/StyledButton";
import { toast } from "../../helpers/toast";

// The agent's referral link: whoever registers from it confirms them as sponsor and joins their team / sub-team.
export default function ReferralLinkCard({ link }: { link: string }) {
    const copy = () =>
        navigator.clipboard
            .writeText(link)
            .then(() => toast.success("Referral link copied."))
            .catch(() => toast.error("Couldn't copy. Select the link and copy it instead."));

    return (
        <Box sx={{ mt: 3 }}>
            <SectionCard title="Your referral link" subtitle="Share it with the people you invite: they register as your recruits, on your team.">
                <Typography variant="body2" sx={{ p: 1.25, borderRadius: 2, backgroundColor: "var(--lr-surface-container)", color: "var(--lr-text-primary)", overflowWrap: "anywhere", fontFamily: "Google Sans Code, monospace" }}>
                    {link}
                </Typography>
                <StyledButton size="small" variant="outlined" startIcon={<ContentCopyRounded />} onClick={copy} sx={{ mt: 1.5, color: "var(--lr-primary)", borderColor: "var(--lr-outline)" }}>
                    Copy link
                </StyledButton>
            </SectionCard>
        </Box>
    );
}
