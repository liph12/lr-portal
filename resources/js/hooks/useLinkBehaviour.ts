import { useEffect, useRef } from "react";
import { router } from "@inertiajs/react";
import useAuthUser from "./useAuthUser";
import usePortalRoutes from "./usePortalRoutes";
import { linkModeFor } from "../helpers/linkBehaviour";

// Same page: filters (preserveState) and steps back (only drops or keeps query values) stay; a step deeper — e.g. Sales
// validation's area → category — is a page of its own.
function isInPlace(url: URL, preserveState: unknown): boolean {
    if (url.pathname !== window.location.pathname) return false;
    if (preserveState !== false) return true;
    const current = new URLSearchParams(window.location.search);

    return Array.from(url.searchParams.entries()).every(([key, value]) => current.get(key) === value);
}

// Applies Settings › Preferences' link settings to every Inertia visit: a page visit set to "new tab" opens there instead.
export default function useLinkBehaviour(onOpenedInTab?: () => void) {
    const user = useAuthUser();
    const routes = usePortalRoutes();
    const latest = useRef({ prefs: user?.preferences?.links, routes, onOpenedInTab });
    latest.current = { prefs: user?.preferences?.links, routes, onOpenedInTab };

    useEffect(
        () =>
            router.on("before", (event) => {
                const visit = event.detail.visit;
                if (visit.method !== "get" || visit.prefetch || visit.only.length || visit.except.length) return;
                if (visit.url.origin !== window.location.origin || isInPlace(visit.url, visit.preserveState)) return;

                const { prefs, routes, onOpenedInTab } = latest.current;
                if (linkModeFor(prefs, routes, window.location.pathname, visit.url.pathname) !== "tab") return;

                // Still inside the click, so the browser allows the new tab.
                event.preventDefault();
                window.open(visit.url.href, "_blank", "noopener");
                onOpenedInTab?.();
            }),
        [],
    );
}
