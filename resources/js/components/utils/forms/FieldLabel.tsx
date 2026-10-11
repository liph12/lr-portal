import { FormHelperText } from "@mui/material";

// The label printed above a StyledTextField / StyledAutocomplete, as on the record-sale forms.
export default function FieldLabel({ text, required }: { text: string; required?: boolean }) {
    return (
        <FormHelperText sx={{ color: "var(--lr-text-secondary)", fontWeight: 500, mb: 0.5, ml: 0.5 }}>
            {text}
            {required && <span style={{ color: "var(--lr-error)" }}> *</span>}
        </FormHelperText>
    );
}
