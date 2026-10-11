import { Box, BoxProps } from "@mui/material";
import { DescriptionOutlined } from "@mui/icons-material";

interface FileLinkProps extends BoxProps<"a"> {
    url: string | null;
    label: string;
}

// An uploaded sale file (proof of transaction, remittance / deposit slip), opened in a new tab; "No <label>" when missing.
export default function FileLink({ url, label, sx, ...props }: FileLinkProps) {
    if (!url) {
        return (
            <Box component="span" sx={{ fontSize: 12, color: "var(--lr-text-secondary)", whiteSpace: "nowrap" }}>
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
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                px: 1,
                height: 24,
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 500,
                whiteSpace: "nowrap",
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
