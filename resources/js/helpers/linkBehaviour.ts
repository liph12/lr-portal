import { PortalRoute } from "../hooks/usePortalRoutes";
import { isRouteActive } from "./routeMatch";
import { LinkMode, LinkPreferences } from "../types";

const covers = (route: PortalRoute, path: string): boolean =>
    isRouteActive(path, route.path) || (route.children ?? []).some((c) => covers(c, path));

// The top-level menu section a path belongs to (its path is the key), or null for pages outside the menu.
export function sectionOf(routes: PortalRoute[], path: string): string | null {
    return routes.find((r) => covers(r, path))?.path ?? null;
}

// The destination's section decides; pages outside the menu (an agent's profile or sales) follow the page they're opened from.
export function linkModeFor(prefs: LinkPreferences | undefined, routes: PortalRoute[], from: string, to: string): LinkMode {
    if (!prefs) return "spa";
    const section = sectionOf(routes, to) ?? sectionOf(routes, from);

    return (section && prefs.sections[section]) || prefs.default;
}
