import { Badge, Box, Tooltip, Typography } from "@mui/material";
import { OnlineUser } from "../../../types";
import UserAvatar from "./UserAvatar";

interface OnlineUsersPanelProps {
    users: OnlineUser[];
    live: boolean;
    // "list" for the dashboard's right rail; "strip" for the row of faces shown on small screens.
    variant: "list" | "strip";
}

function PresenceAvatar({ user, size }: { user: OnlineUser; size: number }) {
    return (
        <Badge
            overlap="circular"
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            variant="dot"
            invisible={!user.online}
            sx={{
                "& .MuiBadge-dot": {
                    width: Math.max(10, size * 0.28),
                    height: Math.max(10, size * 0.28),
                    borderRadius: "50%",
                    backgroundColor: "var(--lr-success-icon)",
                    border: "2px solid var(--lr-surface)",
                },
            }}
        >
            <UserAvatar name={user.name} src={user.avatar} size={size} sx={{ opacity: user.online ? 1 : 0.75 }} />
        </Badge>
    );
}

export default function OnlineUsersPanel({ users, live, variant }: OnlineUsersPanelProps) {
    // Online first, then most recently active (the server already sorts by last activity).
    const sorted = [...users].sort((a, b) => Number(b.online) - Number(a.online));
    const onlineCount = users.filter((u) => u.online).length;

    const heading = (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, color: "var(--lr-text-primary)" }}>
                Online now
            </Typography>
            <Box
                component="span"
                sx={{
                    px: 0.75,
                    borderRadius: 99,
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--lr-success)",
                    backgroundColor: "var(--lr-success-soft)",
                }}
            >
                {onlineCount}
            </Box>
            {live && (
                <Tooltip title="Updates instantly as people sign in and out">
                    <Box
                        component="span"
                        sx={{ ml: "auto", display: "inline-flex", alignItems: "center", gap: 0.5, color: "var(--lr-text-secondary)", fontSize: 11 }}
                    >
                        <Box
                            component="span"
                            sx={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                backgroundColor: "var(--lr-success-icon)",
                                animation: "lrLivePulse 2s ease-in-out infinite",
                                "@keyframes lrLivePulse": { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.3 } },
                            }}
                        />
                        Live
                    </Box>
                </Tooltip>
            )}
        </Box>
    );

    if (variant === "strip") {
        if (users.length === 0) return null;
        return (
            <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2, pb: 1.5, borderBottom: "1px solid var(--lr-border)" }}>
                {heading}
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                    {sorted.map((u) => (
                        <Tooltip key={u.id} title={`${u.name}${u.online ? " · online" : ` · ${u.last_seen} ago`}`}>
                            <Box sx={{ width: 56, textAlign: "center" }}>
                                <PresenceAvatar user={u} size={44} />
                                <Typography
                                    variant="caption"
                                    component="div"
                                    sx={{
                                        mt: 0.5,
                                        lineHeight: 1.2,
                                        color: "var(--lr-text-body)",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {u.name.split(" ")[0]}
                                </Typography>
                            </Box>
                        </Tooltip>
                    ))}
                </Box>
            </Box>
        );
    }

    return (
        <Box component="section" aria-label="Online now" sx={{ px: 2, pt: 2, pb: 1.5 }}>
            {heading}
            {users.length === 0 ? (
                <Typography variant="caption" component="p" sx={{ color: "var(--lr-text-secondary)", py: 0.5 }}>
                    No one else is signed in right now.
                </Typography>
            ) : (
                <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
                    {sorted.map((u) => (
                        <Box
                            component="li"
                            key={u.id}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.25,
                                mx: -1,
                                px: 1,
                                py: 0.75,
                                borderRadius: 2,
                                ":hover": { backgroundColor: "var(--lr-surface-dim)" },
                            }}
                        >
                            <PresenceAvatar user={u} size={34} />
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontSize: 13,
                                        fontWeight: 500,
                                        color: "var(--lr-text-primary)",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {u.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)", fontSize: 11 }}>
                                    {u.role ?? "No role"}
                                </Typography>
                            </Box>
                            <Typography
                                variant="caption"
                                sx={{ color: u.online ? "var(--lr-success)" : "var(--lr-text-secondary)", fontSize: 11, flexShrink: 0 }}
                            >
                                {u.online ? "Active" : `${u.last_seen} ago`}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
}
