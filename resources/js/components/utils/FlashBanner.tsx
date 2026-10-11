import { useEffect, useState } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import { CheckCircleRounded, CloseRounded } from "@mui/icons-material";
import { usePage } from "@inertiajs/react";
import { SharedProps } from "../../types";

export default function FlashBanner() {
    const { flash } = usePage<SharedProps>().props;
    const [message, setMessage] = useState(flash?.success ?? null);

    useEffect(() => setMessage(flash?.success ?? null), [flash?.success]);

    if (!message) return null;

    return (
        <Box
            role="status"
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                mb: 3,
                pl: 2,
                pr: 1,
                py: 1,
                borderRadius: 3,
                color: "var(--lr-success)",
                backgroundColor: "var(--lr-success-soft)",
            }}
        >
            <CheckCircleRounded fontSize="small" />
            <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
                {message}
            </Typography>
            <IconButton
                size="small"
                aria-label="Dismiss"
                onClick={() => setMessage(null)}
                sx={{ color: "inherit" }}
            >
                <CloseRounded fontSize="small" />
            </IconButton>
        </Box>
    );
}
