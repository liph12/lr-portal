import { Box, Typography } from "@mui/material";
import { TrendingUpRounded } from "@mui/icons-material";
import BrokerBadge from "./BrokerBadge";
import { formatDate } from "../../../helpers/formatDate";
import { Designations } from "../../../types/app-data-types";

interface DesignationBadgesProps {
    person: Designations;
    size?: "small" | "medium";
    showDates?: boolean;
}

// Designations beside the role: Broker, and Unit Manager by rate (by dashboard already reads as the role itself).
export default function DesignationBadges({ person, size = "small", showDates = false }: DesignationBadgesProps) {
    const byRate = person.unit_manager_by === "rate";
    if (!person.is_broker && !byRate) return null;

    return (
        <>
            {byRate && (
                <Box
                    component="span"
                    title={person.unit_manager_since ? `Unit Manager by rate since ${formatDate(person.unit_manager_since)}` : "Unit Manager by rate"}
                    sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.375,
                        px: 0.875,
                        py: size === "medium" ? 0.25 : 0.125,
                        borderRadius: 99,
                        color: "var(--lr-success)",
                        backgroundColor: "var(--lr-success-soft)",
                        whiteSpace: "nowrap",
                    }}
                >
                    <TrendingUpRounded sx={{ fontSize: size === "medium" ? 16 : 14 }} aria-hidden />
                    <Typography component="span" variant="caption" sx={{ fontWeight: 500, lineHeight: 1.6 }}>
                        UM by rate{showDates && person.unit_manager_since ? ` · since ${formatDate(person.unit_manager_since)}` : ""}
                    </Typography>
                </Box>
            )}
            {person.is_broker && <BrokerBadge size={size} since={person.broker_since} showDate={showDates} />}
        </>
    );
}
