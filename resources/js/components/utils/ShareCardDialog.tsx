import { ReactNode } from "react";
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { CloseRounded, LinkRounded, WhatsApp, X } from "@mui/icons-material";
import { FacebookGlyph, LinkedInGlyph } from "./BrandGlyphs";
import DotsQrCode from "./DotsQrCode";
import QR_LOGO from "../../../assets/qr-logo.png";
import { toast } from "../../helpers/toast";

interface ShareCardDialogProps {
    open: boolean;
    onClose: () => void;
    // What is shared: the public business profile link and the agent's name for the post text.
    url: string;
    name: string;
}

// Each network's "share this link" page, opened in a new tab.
const TARGETS: { label: string; icon: ReactNode; background: string; href: (url: string, name: string) => string }[] = [
    { label: "Facebook", icon: <FacebookGlyph />, background: "var(--lr-brand-facebook)", href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { label: "LinkedIn", icon: <LinkedInGlyph />, background: "var(--lr-brand-linkedin)", href: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
    { label: "X", icon: <X fontSize="inherit" />, background: "var(--lr-brand-x)", href: (url, name) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(name)}` },
    { label: "WhatsApp", icon: <WhatsApp fontSize="inherit" />, background: "var(--lr-brand-whatsapp)", href: (url, name) => `https://wa.me/?text=${encodeURIComponent(`${name} ${url}`)}` },
];

export default function ShareCardDialog({ open, onClose, url, name }: ShareCardDialogProps) {
    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(url);
            toast.success("Link copied.");
        } catch {
            toast.error("Couldn't copy the link.");
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 5, backgroundColor: "var(--lr-surface)", m: { xs: 2, sm: 4 }, width: { xs: "calc(100% - 32px)", sm: "100%" } } } }}>
            <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: { xs: 2.5, sm: 3 }, fontSize: { xs: 20, sm: 22 }, fontWeight: 700, color: "var(--lr-text-primary)" }}>
                Share this card
                <IconButton onClick={onClose} aria-label="Close" sx={{ color: "var(--lr-text-secondary)" }}>
                    <CloseRounded />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", px: { xs: 2.5, sm: 3 }, pb: { xs: 3, sm: 4 } }}>
                <Stack
                    sx={{
                        mt: 1,
                        p: 2,
                        borderRadius: 5,
                        lineHeight: 0,
                        // Always white so phone cameras read it in dark mode too.
                        backgroundColor: "var(--lr-logo-tile)",
                        border: "4px solid var(--lr-outline)",
                    }}
                >
                    <Box sx={{ width: { xs: 150, sm: 180 }, height: { xs: 150, sm: 180 }, "& svg": { width: "100%", height: "100%" } }}>
                        <DotsQrCode value={url} size={180} label="QR code for this card" logo={QR_LOGO} logoRatio={160 / 251} />
                    </Box>
                </Stack>

                <Typography sx={{ mt: { xs: 2.5, sm: 3 }, fontSize: { xs: 15, sm: 16 }, lineHeight: 1.7, color: "var(--lr-text-body)" }}>
                    Point your camera at the QR code,
                    <br />
                    or share via socials:
                </Typography>

                {/* Five badges: smaller and allowed to wrap so they never spill past a phone's edges. */}
                <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={{ xs: 1.5, sm: 2 }} sx={{ mt: { xs: 2.5, sm: 3 }, width: "100%" }}>
                    {TARGETS.map((t) => (
                        <Tooltip key={t.label} title={`Share on ${t.label}`}>
                            <IconButton
                                component="a"
                                href={t.href(url, name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Share on ${t.label}`}
                                sx={{
                                    width: { xs: 48, sm: 56 },
                                    height: { xs: 48, sm: 56 },
                                    fontSize: { xs: 26, sm: 30 },
                                    position: "relative",
                                    overflow: "hidden",
                                    background: t.background,
                                    color: "var(--lr-brand-ink)",
                                    transition: "transform 0.15s, box-shadow 0.15s",
                                    ":hover": { background: t.background, transform: "translateY(-2px)", boxShadow: "0 6px 16px rgba(0,0,0,.18)" },
                                }}
                            >
                                {t.icon}
                            </IconButton>
                        </Tooltip>
                    ))}
                    <Tooltip title="Copy link">
                        <IconButton
                            onClick={copyLink}
                            aria-label="Copy link"
                            sx={{
                                width: { xs: 48, sm: 56 },
                                height: { xs: 48, sm: 56 },
                                fontSize: { xs: 26, sm: 30 },
                                backgroundColor: "var(--lr-surface-container)",
                                color: "var(--lr-text-body)",
                                ":hover": { backgroundColor: "var(--lr-surface-hover)" },
                            }}
                        >
                            <LinkRounded fontSize="inherit" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </DialogContent>
        </Dialog>
    );
}
