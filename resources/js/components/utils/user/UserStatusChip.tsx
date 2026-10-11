import { Box, Typography } from "@mui/material";
import { UserStatus } from "../../../types/app-data-types";

export const STATUS_LABELS: Record<UserStatus, string> = {
    active: "Active",
    inactive: "Inactive",
    resigned: "Resigned",
    terminated: "Terminated",
};

const STATUS_COLORS: Record<UserStatus, { color: string; bg: string }> = {
    active: { color: "var(--lr-success)", bg: "var(--lr-success-soft)" },
    inactive: { color: "var(--lr-text-secondary)", bg: "var(--lr-surface-container)" },
    resigned: { color: "var(--lr-warning)", bg: "var(--lr-warning-soft)" },
    terminated: { color: "var(--lr-error)", bg: "var(--lr-error-soft)" },
};

export default function UserStatusChip({ status }: { status: UserStatus }) {
    const { color, bg } = STATUS_COLORS[status];

    return (
        <Box
            component="span"
            sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                px: 1,
                py: 0.25,
                borderRadius: 99,
                color,
                backgroundColor: bg,
                whiteSpace: "nowrap",
            }}
        >
            <Box component="span" sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "currentColor" }} />
            <Typography component="span" variant="caption" sx={{ fontWeight: 500, lineHeight: 1.4 }}>
                {STATUS_LABELS[status]}
            </Typography>
        </Box>
    );
}
