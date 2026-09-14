import StyledButton from "./StyledButton";
import {
    ArrowDownwardRounded,
    LeaderboardRounded,
    ExpandMoreRounded,
    KeyboardArrowRightRounded,
} from "@mui/icons-material";
import { Box, Divider, IconButton, Typography } from "@mui/material";
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
                    borderRadius: 0,
                    justifyContent: "flex-start",
                    textTransform: "none",
                    fontWeight: 500,
                    px: 2,
                    py: 1,
                    color: active ? "#1a73e8" : "#3c4043",
                    backgroundColor: active ? "#e8f0fe" : "transparent",
                    "& svg": { color: active ? "#1a73e8" : "#5f6368" },
                    ":hover": {
                        backgroundColor: active ? "#e8f0fe" : "#f1f3f4",
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
        <Box sx={{ height: "100%", backgroundColor: "#fff" }}>
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
                        color: "#1a73e8",
                        backgroundColor: "#e8f0fe",
                        "& svg": { color: "#1a73e8" },
                        ":hover": { backgroundColor: "#e8f0fe" },
                    }}
                >
                    Leaderboards
                </StyledButton>
            </Box>
            <Divider sx={{ borderColor: "#e8eaed" }} />

            {/* Scrollable list */}
            <Box sx={{ position: "relative" }}>
                <Box sx={{ overflowY: "auto" }}>
                    {GROUPS.map((group) => (
                        <Box key={group.period}>
                            <Typography
                                variant="caption"
                                component="div"
                                sx={{
                                    pt: 2,
                                    pb: 0.5,
                                    px: 2,
                                    color: "#5f6368",
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

                <IconButton
                    size="small"
                    sx={{
                        position: "absolute",
                        left: "50%",
                        bottom: 10,
                        transform: "translateX(-50%)",
                        zIndex: 10,
                        backgroundColor: "#fff",
                        border: "1px solid #e8eaed",
                        color: "#1a73e8",
                        boxShadow: "0 1px 3px rgba(60,64,67,.15)",
                        ":hover": { backgroundColor: "#f1f3f4" },
                    }}
                >
                    <ArrowDownwardRounded fontSize="small" />
                </IconButton>
            </Box>
        </Box>
    );
}
