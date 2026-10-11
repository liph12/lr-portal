import { ReactNode } from "react";
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import StyledButton from "./StyledButton";

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: ReactNode;
    confirmLabel: string;
    onConfirm: () => void;
    onClose: () => void;
    // "danger" for destructive actions (red confirm); "primary" for reversible changes.
    tone?: "danger" | "primary";
}

export default function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onClose, tone = "danger" }: ConfirmDialogProps) {
    const [bg, hover, fg] =
        tone === "danger"
            ? ["var(--lr-error)", "var(--lr-error-strong)", "var(--lr-surface)"]
            : ["var(--lr-primary)", "var(--lr-primary-hover)", "var(--lr-on-primary)"];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontSize: 18 }}>{title}</DialogTitle>
            <DialogContent>
                <DialogContentText component="div">{message}</DialogContentText>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <StyledButton onClick={onClose} sx={{ color: "var(--lr-text-secondary)" }}>
                    Cancel
                </StyledButton>
                <StyledButton
                    variant="contained"
                    onClick={onConfirm}
                    sx={{ backgroundColor: bg, color: fg, ":hover": { backgroundColor: hover } }}
                >
                    {confirmLabel}
                </StyledButton>
            </DialogActions>
        </Dialog>
    );
}
