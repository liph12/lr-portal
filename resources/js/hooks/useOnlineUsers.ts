import { useEffect, useMemo, useSyncExternalStore } from "react";
import { router, usePage } from "@inertiajs/react";
import { OnlineUser, SharedProps } from "../types";
import { getPresenceSnapshot, subscribePresence } from "../helpers/presence";

const REFRESH_MS = 60_000;

export interface OnlineUsersState {
    users: OnlineUser[];
    // True while the realtime presence channel is connected; otherwise "online" comes from polling.
    live: boolean;
}

// Realtime presence decides who is online right now; the polled `online_users` prop (from sessions)
// supplies "last seen" for people who have since closed the portal.
export default function useOnlineUsers(enabled: boolean): OnlineUsersState {
    const page = usePage<SharedProps>();
    const recent = page.props.online_users ?? [];
    const myId = page.props.auth?.id;
    const presence = useSyncExternalStore(subscribePresence, getPresenceSnapshot);

    useEffect(() => {
        if (!enabled) return;

        const refresh = () => {
            if (document.visibilityState === "visible") {
                router.reload({ only: ["online_users"], showProgress: false });
            }
        };
        const timer = window.setInterval(refresh, REFRESH_MS);
        document.addEventListener("visibilitychange", refresh);

        return () => {
            window.clearInterval(timer);
            document.removeEventListener("visibilitychange", refresh);
        };
    }, [enabled]);

    const users = useMemo(() => {
        if (!presence.live) return recent;

        const live: OnlineUser[] = [...presence.members.values()]
            .filter((m) => m.id !== myId)
            .map((m) => ({ ...m, online: true, last_seen: "0m" }));
        const liveIds = new Set(live.map((u) => u.id));
        const away = recent.filter((u) => !liveIds.has(u.id)).map((u) => ({ ...u, online: false }));

        return [...live, ...away].slice(0, 12);
    }, [presence, recent, myId]);

    return { users, live: presence.live };
}
