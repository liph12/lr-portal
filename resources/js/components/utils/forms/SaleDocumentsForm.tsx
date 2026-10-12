import { Box } from "@mui/material";
import UploadPOTForm from "./UploadPOTForm";
import UploadHeading from "./UploadHeading";
import { FormErrors } from "../../../types";

export type SaleDocument = "contract" | "proof_of_transaction" | "deposit_slip";

interface SaleDocumentsFormProps {
    files: Record<SaleDocument, File | null>;
    onChange: (field: SaleDocument, file: File | null) => void;
    errors: FormErrors;
    maxFileKb: number;
    onCompressingChange: (field: SaleDocument, compressing: boolean) => void;
}

const FILES: { field: SaleDocument; title: string; text: string; noun: string; required: boolean }[] = [
    { field: "contract", title: "Contract", text: "the signed brokerage contract.", noun: "contract", required: true },
    { field: "proof_of_transaction", title: "Proof of Transaction", text: "a photo with the client at the signing or turnover.", noun: "proof of transaction", required: true },
    { field: "deposit_slip", title: "Deposit Slip", text: "the deposit slip of the payment, when there is one.", noun: "deposit slip", required: false },
];

// Brokerage and rental sales: the contract, a proof of transaction and the deposit slip. The commission (remittance) slip
// isn't uploaded — it's generated from what was encoded.
export default function SaleDocumentsForm({ files, onChange, errors, maxFileKb, onCompressingChange }: SaleDocumentsFormProps) {
    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {FILES.map((f) => (
                <UploadPOTForm
                    key={f.field}
                    value={files[f.field]}
                    onChange={(file) => onChange(f.field, file)}
                    error={errors[f.field] ?? null}
                    maxFileKb={maxFileKb}
                    onCompressingChange={(c) => onCompressingChange(f.field, c)}
                    fileNoun={f.noun}
                    instructions={<UploadHeading title={f.title} text={f.text} required={f.required} />}
                />
            ))}
        </Box>
    );
}
