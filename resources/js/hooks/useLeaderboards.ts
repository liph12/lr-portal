import { useEffect, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { LeaderboardMonth, SharedProps } from "../types";

const REFRESH_MS = 5 * 60_000;

// `leaderboards` is an optional shared prop: the server only computes it when asked, so pages that
// don't show the panel never pay for it. Ask on mount, then refresh while the tab is in view.
export default function useLeaderboards(enabled: boolean): { data: LeaderboardMonth[] | null; loading: boolean } {
    const { leaderboards } = usePage<SharedProps>().props;
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!enabled) return;

        const load = () => {
            if (document.visibilityState !== "visible") return;
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
    }, [enabled]);

    return { data: leaderboards ?? null, loading };
}
