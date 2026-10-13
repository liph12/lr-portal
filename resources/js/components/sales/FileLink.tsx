import { Box, BoxProps } from "@mui/material";
import { DescriptionOutlined, DoNotDisturbAltRounded } from "@mui/icons-material";

interface FileLinkProps extends BoxProps<"a"> {
    url: string | null;
    label: string;
}

// An uploaded sale file (proof of transaction, remittance / deposit slip), opened in a new tab; "No <label>" when missing.
// The pill's box, shared by both: a missing file sits in line with the files beside it (a bare span took the table row's
// line height and dropped out of line).
const pillSx = {
    display: "inline-flex",
    alignItems: "center",
    gap: 0.5,
    px: 1,
    height: 24,
    lineHeight: "22px",
    borderRadius: 99,
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: "nowrap",
} as const;

export default function FileLink({ url, label, sx, ...props }: FileLinkProps) {
    if (!url) {
        return (
            <Box component="span" sx={{ ...pillSx, color: "var(--lr-text-secondary)", border: "1px dashed var(--lr-border)", ...sx }}>
                <DoNotDisturbAltRounded sx={{ fontSize: 13 }} />
                No {label.toLowerCase()}
            </Box>
        );
    }

    return (
        <Box
            component="a"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            {...props}
            sx={{
                ...pillSx,
                textDecoration: "none",
                color: "var(--lr-primary)",
                backgroundColor: "var(--lr-primary-soft)",
                ":hover": { textDecoration: "underline" },
                ...sx,
            }}
        >
            <DescriptionOutlined sx={{ fontSize: 14 }} />
            {label}
        </Box>
    );
}
