import { useState } from "react";
import { Box } from "@mui/material";
import { SendRounded } from "@mui/icons-material";
import { useForm } from "@inertiajs/react";
import FieldLabel from "../utils/forms/FieldLabel";
import UploadPOTForm from "../utils/forms/UploadPOTForm";
import UploadHeading from "../utils/forms/UploadHeading";
import StyledTextField from "../utils/StyledTextField";
import StyledButton from "../utils/StyledButton";

interface ReactivationRequestFormProps {
    maxFileKb: number;
    onCancel?: () => void;
    onSent?: () => void;
}

// The journey's Activation step once it needs reactivating: a supporting file + optional notes → POST /my-journey/reactivation-request.
export default function ReactivationRequestForm({ maxFileKb, onCancel, onSent }: ReactivationRequestFormProps) {
    const form = useForm<{ file: File | null; notes: string }>({ file: null, notes: "" });
    const [compressing, setCompressing] = useState(false);

    return (
        <Box
            component="form"
            onSubmit={(e) => {
                e.preventDefault();
                form.post("/my-journey/reactivation-request", { forceFormData: true, preserveScroll: true, onSuccess: () => (form.reset(), onSent?.()) });
            }}
            sx={{ display: "flex", flexDirection: "column", gap: 3 }}
        >
            <UploadPOTForm
                value={form.data.file}
                onChange={(file) => form.setData("file", file)}
                error={form.errors.file ?? null}
                maxFileKb={maxFileKb}
                onCompressingChange={setCompressing}
                fileNoun="supporting file"
                instructions={<UploadHeading title="Supporting file" text="anything that helps the office review your request — e.g. a sale in progress, a client conversation." required />}
            />
            <Box>
                <FieldLabel text="Notes for the office (optional)" />
                <StyledTextField
                    name="notes"
                    value={form.data.notes}
                    error={form.errors.notes ?? null}
                    handleChange={(e) => form.setData("notes", e.target.value)}
                    props={{ multiline: true, minRows: 2, placeholder: "e.g. why there's been no sale yet" }}
                />
            </Box>
            <Box sx={{ display: "flex", gap: 1.5, justifyContent: onCancel ? "space-between" : "flex-end", flexWrap: "wrap" }}>
                {onCancel && (
                    <StyledButton onClick={onCancel} disabled={form.processing} sx={{ color: "var(--lr-text-secondary)" }}>
                        Cancel
                    </StyledButton>
                )}
                <StyledButton
                    type="submit"
                    variant="contained"
                    endIcon={<SendRounded />}
                    loading={form.processing}
                    disabled={compressing || !form.data.file}
                    sx={{ px: 3, backgroundColor: "var(--lr-primary)", color: "var(--lr-on-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" }, "&.Mui-disabled": { backgroundColor: "var(--lr-surface-container)", color: "var(--lr-text-secondary)" } }}
                >
                    Send my request
                </StyledButton>
            </Box>
        </Box>
    );
}
