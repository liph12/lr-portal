import { Box, Typography } from "@mui/material";
import UploadPOTForm from "./UploadPOTForm";
import { FormErrors } from "../../../types";

interface SaleSlipsFormProps {
    remittanceSlip: File | null;
    depositSlip: File | null;
    onChange: (field: "remittance_slip" | "deposit_slip", file: File | null) => void;
    errors: FormErrors;
    maxFileKb: number;
    onCompressingChange: (field: "remittance_slip" | "deposit_slip", compressing: boolean) => void;
}

function SlipHeading({ title, text, required }: { title: string; text: string; required?: boolean }) {
    return (
        <Box sx={{ backgroundColor: "var(--lr-primary-soft)", borderRadius: 2, p: 2, mb: 2 }}>
            <Typography variant="body2" sx={{ color: "var(--lr-text-body)", lineHeight: 1.6 }}>
                <strong>{title}</strong>
                {required ? <span style={{ color: "var(--lr-error)" }}> *</span> : " (optional)"} — {text}
            </Typography>
        </Box>
    );
}

// Rental and brokerage sales: the remittance slip is the proof of transaction; the deposit slip is kept when there is one.
export default function SaleSlipsForm({ remittanceSlip, depositSlip, onChange, errors, maxFileKb, onCompressingChange }: SaleSlipsFormProps) {
    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <UploadPOTForm
                value={remittanceSlip}
                onChange={(file) => onChange("remittance_slip", file)}
                error={errors.remittance_slip ?? null}
                maxFileKb={maxFileKb}
                onCompressingChange={(c) => onCompressingChange("remittance_slip", c)}
                fileNoun="remittance slip"
                instructions={
                    <SlipHeading
                        title="Remittance Slip"
                        text="the proof of transaction for this sale: a readable copy of the remittance slip."
                        required
                    />
                }
            />
            <UploadPOTForm
                value={depositSlip}
                onChange={(file) => onChange("deposit_slip", file)}
                error={errors.deposit_slip ?? null}
                maxFileKb={maxFileKb}
                onCompressingChange={(c) => onCompressingChange("deposit_slip", c)}
                fileNoun="deposit slip"
                instructions={<SlipHeading title="Deposit Slip" text="the client's security deposit / advance payment slip." />}
            />
        </Box>
    );
}
