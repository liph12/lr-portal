import { Box, Typography } from "@mui/material";
import { ApartmentRounded, HomeWorkOutlined } from "@mui/icons-material";
import UserAvatar from "./user/UserAvatar";
import { formatPeso, formatPesoCompact } from "../../helpers/formatNumber";
import { LeaderboardEntry } from "../../types";

interface LeaderboardListProps {
    entries: LeaderboardEntry[];
    kind: "agents" | "projects" | "developers";
}

// Rank colours carry no meaning on their own; the number beside each is the real cue.
const MEDALS = ["#f9ab00", "#9aa0a6", "#c26401"];

export default function LeaderboardList({ entries, kind }: LeaderboardListProps) {
    if (entries.length === 0) {
        return (
            <Typography variant="caption" component="p" sx={{ px: 2, py: 1, color: "var(--lr-text-secondary)" }}>
                No sales yet.
            </Typography>
        );
    }

    return (
        <Box component="ol" sx={{ listStyle: "none", m: 0, px: 1, py: 0.5 }}>
            {entries.map((e, i) => (
                <Box
                    component="li"
                    key={`${e.id ?? ""}${e.name}`}
                    title={`${e.name}: ${formatPeso(e.value)} from ${e.sales} ${e.sales === 1 ? "sale" : "sales"}`}
                    sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1, py: 0.75, borderRadius: 2, ":hover": { backgroundColor: "var(--lr-surface-dim)" } }}
                >
                    <Typography variant="caption" sx={{ width: 16, textAlign: "center", fontWeight: 700, color: MEDALS[i] ?? "var(--lr-text-secondary)" }}>
                        {i + 1}
                    </Typography>
                    {kind === "agents" ? (
                        <UserAvatar name={e.name} src={e.avatar} size={28} />
                    ) : (
                        <Box
                            sx={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "var(--lr-primary)",
                                backgroundColor: "var(--lr-primary-soft)",
                            }}
                        >
                            {kind === "projects" ? <HomeWorkOutlined sx={{ fontSize: 16 }} /> : <ApartmentRounded sx={{ fontSize: 16 }} />}
                        </Box>
                    )}
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                            variant="body2"
                            sx={{ fontSize: 12, fontWeight: 500, color: "var(--lr-text-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        >
                            {e.name}
                        </Typography>
                        <Typography variant="caption" fontFamily="Google Sans Code" sx={{ color: "var(--lr-text-secondary)", fontSize: 11 }}>
                            {formatPesoCompact(e.value)} · {e.sales} {e.sales === 1 ? "sale" : "sales"}
                        </Typography>
                    </Box>
                </Box>
            ))}
        </Box>
    );
}
