import { useEffect, useState } from "react";
import { Box, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";
import { CloseRounded, DownloadRounded, ReceiptLongRounded } from "@mui/icons-material";
import StyledButton from "../utils/StyledButton";

interface CommissionSlipPreviewProps {
    // The record-sale page's preview endpoint (brokerage or rental).
    url: string;
    // The fields the slip prints, as the server expects them (ids for the area, type and agents).
    fields: Record<string, string | number | null | undefined>;
}

const xsrf = () => decodeURIComponent(document.cookie.split("; ").find((c) => c.startsWith("XSRF-TOKEN="))?.split("=")[1] ?? "");

// The commission slip exactly as saving would generate it, from what's filled in so far — fetched as an image (not a page
// visit) and never stored.
export default function CommissionSlipPreview({ url: endpoint, fields }: CommissionSlipPreviewProps) {
    const [open, setOpen] = useState(false);
    const [url, setUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // The image lives only in this tab; free it when the dialog closes.
    useEffect(() => () => {
        if (url) URL.revokeObjectURL(url);
    }, [url]);

    const show = async () => {
        setOpen(true);
        setUrl(null);
        setError(null);
        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "image/png", "X-Requested-With": "XMLHttpRequest", "X-XSRF-TOKEN": xsrf() },
                credentials: "same-origin",
                body: JSON.stringify(Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== "" && v !== null && v !== undefined))),
            });
            if (!res.ok) throw new Error(res.status === 422 ? "Some values can't be read yet — check the amounts and dates." : "Couldn't draw the slip right now.");
            setUrl(URL.createObjectURL(await res.blob()));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Couldn't draw the slip right now.");
        }
    };

    return (
        <>
            <StyledButton variant="outlined" startIcon={<ReceiptLongRounded />} onClick={show} sx={{ color: "var(--lr-primary)", borderColor: "var(--lr-outline)" }}>
                Preview commission slip
            </StyledButton>
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 4, backgroundColor: "var(--lr-surface)" } } }}>
                <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, color: "var(--lr-text-primary)" }}>
                    <Box sx={{ flex: 1 }}>
                        Commission slip preview
                        <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                            Saving the sale generates this slip with its serial number.
                        </Typography>
                    </Box>
                    {url && (
                        <IconButton component="a" href={url} download="commission-slip-preview.png" aria-label="Download the preview">
                            <DownloadRounded />
                        </IconButton>
                    )}
                    <IconButton aria-label="Close" onClick={() => setOpen(false)}>
                        <CloseRounded />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    {url ? (
                        <Box component="img" src={url} alt="Commission slip preview" sx={{ width: "100%", display: "block", borderRadius: 2, border: "1px solid var(--lr-border)" }} />
                    ) : error ? (
                        <Typography sx={{ color: "var(--lr-error)", py: 4, textAlign: "center" }}>{error}</Typography>
                    ) : (
                        <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
                            <CircularProgress size={28} aria-label="Drawing the slip" />
                        </Box>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
