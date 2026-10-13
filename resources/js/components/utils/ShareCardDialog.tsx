import { ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { CloseRounded, Facebook, LinkedIn, LinkRounded, WhatsApp, X } from "@mui/icons-material";
import DotsQrCode from "./DotsQrCode";
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
    { label: "Facebook", icon: <Facebook fontSize="inherit" />, background: "var(--lr-brand-facebook)", href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { label: "LinkedIn", icon: <LinkedIn fontSize="inherit" />, background: "var(--lr-brand-linkedin)", href: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
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
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 5, backgroundColor: "var(--lr-surface)" } } }}>
            <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 22, fontWeight: 700, color: "var(--lr-text-primary)" }}>
                Share this card
                <IconButton onClick={onClose} aria-label="Close" sx={{ color: "var(--lr-text-secondary)" }}>
                    <CloseRounded />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", pb: 4 }}>
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
                    <DotsQrCode value={url} size={180} label="QR code for this card" />
                </Stack>

                <Typography sx={{ mt: 3, fontSize: 16, lineHeight: 1.7, color: "var(--lr-text-body)" }}>
                    Point your camera at the QR code,
                    <br />
                    or share via socials:
                </Typography>

                <Stack direction="row" justifyContent="center" gap={2} sx={{ mt: 3 }}>
                    {TARGETS.map((t) => (
                        <Tooltip key={t.label} title={`Share on ${t.label}`}>
                            <IconButton
                                component="a"
                                href={t.href(url, name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Share on ${t.label}`}
                                sx={{
                                    width: 56,
                                    height: 56,
                                    fontSize: 30,
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
                                width: 56,
                                height: 56,
                                fontSize: 30,
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
