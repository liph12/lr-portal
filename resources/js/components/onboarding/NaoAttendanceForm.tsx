import { useState } from "react";
import { Box } from "@mui/material";
import { SendRounded } from "@mui/icons-material";
import { useForm } from "@inertiajs/react";
import FieldLabel from "../utils/forms/FieldLabel";
import UploadPOTForm from "../utils/forms/UploadPOTForm";
import UploadHeading from "../utils/forms/UploadHeading";
import StyledTextField from "../utils/StyledTextField";
import StyledButton from "../utils/StyledButton";

interface NaoAttendanceFormProps {
    maxFileKb: number;
    onCancel: () => void;
    onSent: () => void;
}

const today = () => new Date().toLocaleDateString("en-CA");

// "Yes, I attended": a proof (photo, selfie or screenshot) and the NAO date → POST /welcome/nao/attendance, for the sponsor to approve.
export default function NaoAttendanceForm({ maxFileKb, onCancel, onSent }: NaoAttendanceFormProps) {
    const form = useForm<{ proof: File | null; attended_on: string }>({ proof: null, attended_on: "" });
    const [compressing, setCompressing] = useState(false);

    return (
        <Box
            component="form"
            onSubmit={(e) => {
                e.preventDefault();
                form.post("/welcome/nao/attendance", { forceFormData: true, onSuccess: onSent });
            }}
            sx={{ display: "flex", flexDirection: "column", gap: 3 }}
        >
            <UploadPOTForm
                value={form.data.proof}
                onChange={(file) => form.setData("proof", file)}
                error={form.errors.proof ?? null}
                maxFileKb={maxFileKb}
                onCompressingChange={setCompressing}
                fileNoun="proof"
                instructions={<UploadHeading title="Proof of attendance" text="a photo or selfie at the NAO, or a screenshot / certificate showing you attended." required />}
            />
            <Box sx={{ maxWidth: 280 }}>
                <FieldLabel text="Date of the NAO" required />
                <StyledTextField
                    type="date"
                    name="attended_on"
                    value={form.data.attended_on}
                    error={form.errors.attended_on ?? null}
                    handleChange={(e) => form.setData("attended_on", e.target.value)}
                    props={{ slotProps: { htmlInput: { max: today() } } }}
                />
            </Box>
            <Box sx={{ display: "flex", gap: 1.5, justifyContent: "space-between", flexWrap: "wrap" }}>
                <StyledButton onClick={onCancel} disabled={form.processing} sx={{ color: "var(--lr-text-secondary)" }}>
                    Back
                </StyledButton>
                <StyledButton
                    type="submit"
                    variant="contained"
                    endIcon={<SendRounded />}
                    loading={form.processing}
                    disabled={compressing || !form.data.proof || !form.data.attended_on}
                    sx={{ px: 3, backgroundColor: "var(--lr-primary)", color: "var(--lr-on-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" }, "&.Mui-disabled": { backgroundColor: "var(--lr-surface-container)", color: "var(--lr-text-secondary)" } }}
                >
                    Send for approval
                </StyledButton>
            </Box>
        </Box>
    );
}
