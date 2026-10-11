import { Box, Typography } from "@mui/material";
import { BlockRounded } from "@mui/icons-material";
import { SalesEncodingState } from "../../types/app-data-types";

interface SalesEncodingNoticeProps {
    encoding: SalesEncodingState;
    // A server rejection (errors.sales_encoding) after the page loaded.
    error?: string | null;
}

// Shown on the record-sale pages while a superadmin has switched recording off.
export default function SalesEncodingNotice({ encoding, error }: SalesEncodingNoticeProps) {
    if (encoding.enabled && !error) return null;

    return (
        <Box
            role="alert"
            sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 1.5,
                p: 2,
                mb: 3,
                borderRadius: 3,
                backgroundColor: "var(--lr-error-soft)",
                border: "1px solid var(--lr-border)",
            }}
        >
            <BlockRounded sx={{ color: "var(--lr-error)", mt: 0.25 }} />
            <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--lr-text-primary)" }}>
                    Recording sales is turned off
                </Typography>
                <Typography variant="body2" sx={{ color: "var(--lr-text-body)" }}>
                    {error ?? encoding.message ?? "You can look around, but new sales can't be submitted until it's turned back on."}
                </Typography>
            </Box>
        </Box>
    );
}
