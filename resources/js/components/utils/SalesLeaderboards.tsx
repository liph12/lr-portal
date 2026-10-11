import { useState } from "react";
import { Box, Divider, LinearProgress, Typography } from "@mui/material";
import { ExpandMoreRounded, KeyboardArrowRightRounded, LeaderboardRounded } from "@mui/icons-material";
import StyledButton from "./StyledButton";
import LeaderboardList from "./LeaderboardList";
import useLeaderboards from "../../hooks/useLeaderboards";
import { formatMonth } from "../../helpers/formatNumber";
import { LeaderboardMonth } from "../../types";

const BOARDS: { key: keyof LeaderboardMonth["boards"]; label: string }[] = [
    { key: "agents", label: "Top Agents" },
    { key: "projects", label: "Top Projects" },
    { key: "developers", label: "Top Developers" },
];

// Right-rail panel; only rendered for roles with `view_leaderboards` (and the server sends nothing otherwise).
export default function SalesLeaderboards() {
    const { data, loading } = useLeaderboards(true);
    // One board open at a time; this month's top agents by default.
    const [open, setOpen] = useState<string | null>(null);

    return (
        <Box component="section" aria-label="Sales leaderboards" sx={{ pb: 2 }}>
            <Box sx={{ pt: 1.5, pb: 1, px: 2 }}>
                <StyledButton
                    startIcon={<LeaderboardRounded />}
                    size="small"
                    variant="text"
                    sx={{
                        px: 2,
                        cursor: "default",
                        color: "var(--lr-primary)",
                        backgroundColor: "var(--lr-primary-soft)",
                        ":hover": { backgroundColor: "var(--lr-primary-soft)" },
                    }}
                >
                    Leaderboards
                </StyledButton>
            </Box>
            <Divider sx={{ borderColor: "var(--lr-border)" }} />
            {loading && !data && <LinearProgress sx={{ height: 2 }} />}

            <Box sx={{ pr: 1.5 }}>
                {data?.map((month, m) => (
                    <Box key={month.month}>
                        <Typography
                            variant="caption"
                            component="div"
                            sx={{ pt: 2, pb: 0.5, px: 2, color: "var(--lr-text-secondary)", fontWeight: 500, letterSpacing: 0.3 }}
                        >
                            {formatMonth(month.month, "long")} Sales
                        </Typography>
                        {BOARDS.map((board) => {
                            const id = `${month.month}:${board.key}`;
                            const isOpen = open === id || (open === null && m === 0 && board.key === "agents");
                            const count = month.boards[board.key].length;
                            return (
                                <Box key={board.key}>
                                    <StyledButton
                                        startIcon={isOpen ? <ExpandMoreRounded /> : <KeyboardArrowRightRounded />}
                                        fullWidth
                                        size="small"
                                        variant="text"
                                        aria-expanded={isOpen}
                                        onClick={() => setOpen(isOpen ? "" : id)}
                                        sx={{
                                            // flush-left, rounded right cap — mirrors the sidebar items
                                            borderRadius: "0 99px 99px 0",
                                            justifyContent: "flex-start",
                                            px: 2,
                                            py: 1,
                                            color: isOpen ? "var(--lr-primary)" : "var(--lr-text-body)",
                                            backgroundColor: isOpen ? "var(--lr-primary-soft)" : "transparent",
                                            "& svg": { color: isOpen ? "var(--lr-primary)" : "var(--lr-text-secondary)" },
                                            ":hover": { backgroundColor: isOpen ? "var(--lr-primary-soft)" : "var(--lr-surface-container)" },
                                        }}
                                    >
                                        <Box component="span" sx={{ flex: 1, textAlign: "left" }}>
                                            {board.label}
                                        </Box>
                                        <Box component="span" sx={{ fontSize: 11, color: "var(--lr-text-secondary)" }}>
                                            {count || ""}
                                        </Box>
                                    </StyledButton>
                                    {isOpen && <LeaderboardList entries={month.boards[board.key]} kind={board.key} />}
                                </Box>
                            );
                        })}
                    </Box>
                ))}
            </Box>
        </Box>
    );
}
