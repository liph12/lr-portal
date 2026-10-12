import { Box, Typography } from "@mui/material";

// The tinted note above each upload on the record-sale forms: what the file is, and whether it's required.
export default function UploadHeading({ title, text, required }: { title: string; text: string; required?: boolean }) {
    return (
        <Box sx={{ backgroundColor: "var(--lr-primary-soft)", borderRadius: 2, p: 2, mb: 2 }}>
            <Typography variant="body2" sx={{ color: "var(--lr-text-body)", lineHeight: 1.6 }}>
                <strong>{title}</strong>
                {required ? <span style={{ color: "var(--lr-error)" }}> *</span> : " (optional)"} — {text}
            </Typography>
        </Box>
    );
}
