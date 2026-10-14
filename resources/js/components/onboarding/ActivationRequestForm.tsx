import { useState } from "react";
import { Box } from "@mui/material";
import { SendRounded } from "@mui/icons-material";
import { useForm } from "@inertiajs/react";
import FieldLabel from "../utils/forms/FieldLabel";
import UploadPOTForm from "../utils/forms/UploadPOTForm";
import UploadHeading from "../utils/forms/UploadHeading";
import StyledTextField from "../utils/StyledTextField";
import StyledButton from "../utils/StyledButton";

interface ActivationRequestFormProps {
    maxFileKb: number;
    onCancel?: () => void;
    onSent?: () => void;
}

// The journey's last step: the signed request for activation + the proof of transaction of the sale → POST /my-journey/activation-request.
export default function ActivationRequestForm({ maxFileKb, onCancel, onSent }: ActivationRequestFormProps) {
    const form = useForm<{ request_form: File | null; proof_of_transaction: File | null; notes: string }>({ request_form: null, proof_of_transaction: null, notes: "" });
    const [compressingForm, setCompressingForm] = useState(false);
    const [compressingPot, setCompressingPot] = useState(false);

    return (
        <Box
            component="form"
            onSubmit={(e) => {
                e.preventDefault();
                form.post("/my-journey/activation-request", { forceFormData: true, preserveScroll: true, onSuccess: () => (form.reset(), onSent?.()) });
            }}
            sx={{ display: "flex", flexDirection: "column", gap: 3 }}
        >
            <UploadPOTForm
                value={form.data.request_form}
                onChange={(file) => form.setData("request_form", file)}
                error={form.errors.request_form ?? null}
                maxFileKb={maxFileKb}
                onCompressingChange={setCompressingForm}
                fileNoun="request for activation"
                instructions={<UploadHeading title="Request for activation" text="your signed request to activate your LR account — a scan or a clear photo." required />}
            />
            <UploadPOTForm
                value={form.data.proof_of_transaction}
                onChange={(file) => form.setData("proof_of_transaction", file)}
                error={form.errors.proof_of_transaction ?? null}
                maxFileKb={maxFileKb}
                onCompressingChange={setCompressingPot}
                instructions={<UploadHeading title="Proof of transaction" text="of the sale that's ready for encoding — e.g. a photo with your client, or the reservation receipt." required />}
            />
            <Box>
                <FieldLabel text="Notes for the office (optional)" />
                <StyledTextField
                    name="notes"
                    value={form.data.notes}
                    error={form.errors.notes ?? null}
                    handleChange={(e) => form.setData("notes", e.target.value)}
                    props={{ multiline: true, minRows: 2, placeholder: "e.g. the project and unit of the sale" }}
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
                    disabled={compressingForm || compressingPot || !form.data.request_form || !form.data.proof_of_transaction}
                    sx={{ px: 3, backgroundColor: "var(--lr-primary)", color: "var(--lr-on-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" }, "&.Mui-disabled": { backgroundColor: "var(--lr-surface-container)", color: "var(--lr-text-secondary)" } }}
                >
                    Send my request
                </StyledButton>
            </Box>
        </Box>
    );
}
