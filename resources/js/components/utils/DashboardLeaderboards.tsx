import StyledButton from "./StyledButton";
import {
    LeaderboardRounded,
    ExpandMoreRounded,
    KeyboardArrowRightRounded,
} from "@mui/icons-material";
import { Box, Divider, Typography } from "@mui/material";
import TopAgentsTable from "./tables/TopAgentsTable";

interface LeaderRow {
    label: string;
    active?: boolean;
    showTable?: boolean;
}

interface LeaderGroup {
    period: string;
    rows: LeaderRow[];
}

const GROUPS: LeaderGroup[] = [
    {
        period: "December 2025 Sales",
        rows: [
            { label: "Top Agents", active: true, showTable: true },
            { label: "Top Teams" },
            { label: "Top Teams / Recruits" },
        ],
    },
    {
        period: "November 2025 Sales",
        rows: [
            { label: "Top 20 Agents" },
            { label: "Top 20 Teams" },
            { label: "Top 10 Agents (Brokerage)" },
            { label: "Top 10 Agents / Developer" },
            { label: "Top 10 Developers" },
        ],
    },
];

function LeaderButton({ label, active, showTable }: LeaderRow) {
    return (
        <>
            <StyledButton
                startIcon={
                    active ? (
                        <ExpandMoreRounded />
                    ) : (
                        <KeyboardArrowRightRounded />
                    )
                }
                fullWidth
                size="small"
                variant="text"
                sx={{
                    // flush-left, rounded right cap — mirrors the sidebar items
                    borderTopRightRadius: 99,
                    borderBottomRightRadius: 99,
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                    justifyContent: "flex-start",
                    textTransform: "none",
                    fontWeight: 500,
                    px: 2,
                    py: 1,
                    color: active ? "var(--lr-primary)" : "var(--lr-text-body)",
                    backgroundColor: active ? "var(--lr-primary-soft)" : "transparent",
                    "& svg": { color: active ? "var(--lr-primary)" : "var(--lr-text-secondary)" },
                    ":hover": {
                        backgroundColor: active ? "var(--lr-primary-soft)" : "var(--lr-surface-container)",
                    },
                }}
            >
                {label}
            </StyledButton>
            {showTable && <TopAgentsTable />}
        </>
    );
}

export default function DashboardLeaderboards() {
    return (
        <Box sx={{ height: "100%", backgroundColor: "var(--lr-surface)" }}>
            {/* Header */}
            <Box sx={{ pt: 1.5, pb: 1, px: 2 }}>
                <StyledButton
                    startIcon={<LeaderboardRounded />}
                    size="small"
                    variant="text"
                    sx={{
                        borderRadius: 99,
                        textTransform: "none",
                        fontWeight: 500,
                        px: 2,
                        color: "var(--lr-primary)",
                        backgroundColor: "var(--lr-primary-soft)",
                        "& svg": { color: "var(--lr-primary)" },
                        ":hover": { backgroundColor: "var(--lr-primary-soft)" },
                        cursor: "default",
                    }}
                >
                    Leaderboards
                </StyledButton>
            </Box>
            <Divider sx={{ borderColor: "var(--lr-border)" }} />

            <Box sx={{ pr: 1.5, pb: 2 }}>
                {GROUPS.map((group) => (
                    <Box key={group.period}>
                        <Typography
                            variant="caption"
                            component="div"
                            sx={{
                                pt: 2,
                                pb: 0.5,
                                px: 2,
                                color: "var(--lr-text-secondary)",
                                fontWeight: 500,
                                letterSpacing: 0.3,
                            }}
                        >
                            {group.period}
                        </Typography>
                        {group.rows.map((row) => (
                            <LeaderButton key={row.label} {...row} />
                        ))}
                    </Box>
                ))}
            </Box>
        </Box>
    );
}
