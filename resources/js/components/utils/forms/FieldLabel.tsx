import { FormHelperText } from "@mui/material";

interface FieldLabelProps {
    text: string;
    required?: boolean;
}

export default function FieldLabel({ text, required }: FieldLabelProps) {
    return (
        <FormHelperText sx={{ color: "var(--lr-text-secondary)", fontWeight: 500, mb: 0.5, ml: 0.5 }}>
            {text}
            {required && <span style={{ color: "var(--lr-error)" }}> *</span>}
        </FormHelperText>
    );
}
