import { Box, Divider } from "@mui/material";
import OnlineUsersPanel from "../utils/user/OnlineUsersPanel";
import SalesLeaderboards from "../utils/SalesLeaderboards";
import useAuthUser from "../../hooks/useAuthUser";
import useOnlineUsers from "../../hooks/useOnlineUsers";

interface SideRailProps {
    // "rail": desktop right column (online list pinned, leaderboards scroll); "stacked": below the page on small screens.
    variant: "rail" | "stacked";
}

// Shown on every signed-in route by AppLayout; renders nothing for users with neither panel.
export default function SideRail({ variant }: SideRailProps) {
    const user = useAuthUser();
    // `online_users` is only shared to back-office portals.
    const showOnline = variant === "rail" && !!user?.portal;
    const showLeaderboards = !!user?.can.view_leaderboards;
    const { users, live } = useOnlineUsers(showOnline);

    if (!showOnline && !showLeaderboards) return null;

    if (variant === "stacked") {
        return (
            <Box component="aside" sx={{ borderTop: "1px solid var(--lr-border)", backgroundColor: "var(--lr-surface)" }}>
                <SalesLeaderboards />
            </Box>
        );
    }

    return (
        <Box
            component="aside"
            sx={{
                width: { lg: 300, xl: 340 },
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                borderLeft: "1px solid var(--lr-border)",
                backgroundColor: "var(--lr-surface)",
            }}
        >
            {/* Pinned above the rail's own scroll so who's online is always in view, like a chat sidebar. */}
            {showOnline && (
                <Box sx={{ flexShrink: 0 }}>
                    <OnlineUsersPanel users={users} live={live} variant="list" />
                    {showLeaderboards && <Divider sx={{ borderColor: "var(--lr-border)" }} />}
                </Box>
            )}
            {showLeaderboards && (
                <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
                    <SalesLeaderboards />
                </Box>
            )}
        </Box>
    );
}
