import { useEffect, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { LeaderboardMonth, SharedProps } from "../types";

const REFRESH_MS = 5 * 60_000;

// Optional props vanish on the next page visit, so the last result is kept here to show on every route.
// Keyed by who it was fetched for: another role (or a "View as" preview) must not see it.
let cache: { data: LeaderboardMonth[]; at: number; for: string } | null = null;

// `leaderboards` is an optional shared prop: the server only computes it when asked, so pages that
// don't show the panel never pay for it. Ask when there's nothing recent, then refresh while the tab is in view.
export default function useLeaderboards(enabled: boolean): { data: LeaderboardMonth[] | null; loading: boolean } {
    const { leaderboards, auth } = usePage<SharedProps>().props;
    const [loading, setLoading] = useState(false);
    const viewer = `${auth?.id ?? ""}|${auth?.viewing_as ?? ""}|${auth?.role ?? ""}`;

    if (cache && cache.for !== viewer) cache = null;
    if (leaderboards && leaderboards !== cache?.data) {
        cache = { data: leaderboards, at: Date.now(), for: viewer };
    }

    useEffect(() => {
        if (!enabled) return;

        const load = () => {
            if (document.visibilityState !== "visible") return;
            if (cache && cache.for === viewer && Date.now() - cache.at < REFRESH_MS) return;
            router.reload({
                only: ["leaderboards"],
                showProgress: false,
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            });
        };

        load();
        const timer = window.setInterval(load, REFRESH_MS);
        document.addEventListener("visibilitychange", load);

        return () => {
            window.clearInterval(timer);
            document.removeEventListener("visibilitychange", load);
        };
    }, [enabled, viewer]);

    return { data: leaderboards ?? (cache?.for === viewer ? cache.data : null), loading };
}
