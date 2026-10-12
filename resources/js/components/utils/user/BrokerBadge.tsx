import { Box, Typography } from "@mui/material";
import { WorkspacePremiumRounded } from "@mui/icons-material";
import { formatDate } from "../../../helpers/formatDate";

interface BrokerBadgeProps {
    size?: "small" | "medium";
    since?: string | null;
    // Print the date on the badge (profile header); elsewhere it's in the tooltip.
    showDate?: boolean;
}

// Broker is an identifier on the agent (agents.is_broker), shown beside the role — never a role of its own.
export default function BrokerBadge({ size = "small", since = null, showDate = false }: BrokerBadgeProps) {
    return (
        <Box
            component="span"
            title={since ? `Broker since ${formatDate(since)}` : "Broker"}
            sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.375,
                px: 0.875,
                py: size === "medium" ? 0.25 : 0.125,
                borderRadius: 99,
                color: "var(--lr-warning)",
                backgroundColor: "var(--lr-warning-soft)",
                whiteSpace: "nowrap",
            }}
        >
            <WorkspacePremiumRounded sx={{ fontSize: size === "medium" ? 16 : 14 }} aria-hidden />
            <Typography component="span" variant="caption" sx={{ fontWeight: 500, lineHeight: 1.6 }}>
                Broker{showDate && since ? ` · since ${formatDate(since)}` : ""}
            </Typography>
        </Box>
    );
}
