import { Box, BoxProps } from "@mui/material";

interface StatusChipProps extends BoxProps {
    status: string | null;
}

// Colour backs up the word, never replaces it: the label always reads the status.
const TONES: Record<string, [string, string]> = {
    active: ["var(--lr-success-soft)", "var(--lr-success)"],
    inactive: ["var(--lr-surface-container)", "var(--lr-text-secondary)"],
    resigned: ["var(--lr-warning-soft)", "var(--lr-warning)"],
    deactivated: ["var(--lr-error-soft)", "var(--lr-error)"],
    terminated: ["var(--lr-error-soft)", "var(--lr-error)"],
    local: ["var(--lr-surface-container)", "var(--lr-text-body)"],
    global_partner: ["var(--lr-primary-soft)", "var(--lr-primary)"],
};

export default function StatusChip({ status, sx, ...props }: StatusChipProps) {
    const [bg, fg] = TONES[status ?? ""] ?? TONES.inactive;

    return (
        <Box
            component="span"
            {...props}
            sx={{
                display: "inline-flex",
                alignItems: "center",
                // Fixed size: table cells set line-height to the row height, which would stretch the pill.
                height: 22,
                lineHeight: "22px",
                px: 1.25,
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 500,
                textTransform: "capitalize",
                whiteSpace: "nowrap",
                backgroundColor: bg,
                color: fg,
                ...sx,
            }}
        >
            {props.children ?? status ?? "—"}
        </Box>
    );
}
