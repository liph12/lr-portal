import { ReactElement } from "react";
import { Box, Link as MuiLink, Typography } from "@mui/material";
import { EmailOutlined, PhoneOutlined } from "@mui/icons-material";
import UserAvatar from "../utils/user/UserAvatar";
import { NaoState } from "../../types/app-data-types";

// Who approves a face-to-face NAO attendance — the sponsor / upline — and how to reach them.
export default function SponsorContactCard({ sponsor }: { sponsor: NonNullable<NaoState["sponsor"]> }) {
    const lines = [
        sponsor.mobile && { icon: <PhoneOutlined fontSize="small" />, label: sponsor.mobile, href: `tel:${sponsor.mobile.replace(/[^\d+]/g, "")}` },
        sponsor.email && { icon: <EmailOutlined fontSize="small" />, label: sponsor.email, href: `mailto:${sponsor.email}` },
    ].filter((l): l is { icon: ReactElement; label: string; href: string } => !!l);

    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, p: 2, borderRadius: 3, border: "1px solid var(--lr-border)", backgroundColor: "var(--lr-surface-container)", flexWrap: "wrap" }}>
            <UserAvatar name={sponsor.name} src={sponsor.avatar} size={56} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)", fontWeight: 500, letterSpacing: 0.3 }}>
                    YOUR SPONSOR / UPLINE
                </Typography>
                <Typography sx={{ fontWeight: 500, color: "var(--lr-text-primary)", fontSize: 17 }}>{sponsor.name}</Typography>
                {lines.length > 0 ? (
                    <Box sx={{ mt: 0.5, display: "flex", flexDirection: "column", gap: 0.25 }}>
                        {lines.map((l) => (
                            <MuiLink key={l.href} href={l.href} underline="hover" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, color: "var(--lr-primary)", fontSize: 14, wordBreak: "break-all" }}>
                                {l.icon}
                                {l.label}
                            </MuiLink>
                        ))}
                    </Box>
                ) : (
                    <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                        No contact details on file — ask your branch office.
                    </Typography>
                )}
            </Box>
        </Box>
    );
}
