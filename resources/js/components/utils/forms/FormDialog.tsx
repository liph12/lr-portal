import { FormEvent, ReactNode } from "react";
import { Box, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import StyledButton from "../StyledButton";

interface FormDialogProps {
    open: boolean;
    title: string;
    submitLabel: string;
    processing: boolean;
    onSubmit: () => void;
    onClose: () => void;
    children: ReactNode;
}

// Dialog shell for small create/edit forms: fields stacked, Cancel + primary action.
export default function FormDialog({ open, title, submitLabel, processing, onSubmit, onClose, children }: FormDialogProps) {
    const submit = (e: FormEvent) => {
        e.preventDefault();
        onSubmit();
    };

    return (
        <Dialog open={open} onClose={processing ? undefined : onClose} maxWidth="sm" fullWidth>
            <Box component="form" onSubmit={submit} noValidate>
                <DialogTitle sx={{ fontSize: 18 }}>{title}</DialogTitle>
                <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "4px !important" }}>{children}</DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <StyledButton onClick={onClose} disabled={processing} sx={{ color: "var(--lr-text-secondary)" }}>
                        Cancel
                    </StyledButton>
                    <StyledButton
                        type="submit"
                        variant="contained"
                        loading={processing}
                        sx={{ px: 3, backgroundColor: "var(--lr-primary)", color: "var(--lr-on-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } }}
                    >
                        {submitLabel}
                    </StyledButton>
                </DialogActions>
            </Box>
        </Dialog>
    );
}
