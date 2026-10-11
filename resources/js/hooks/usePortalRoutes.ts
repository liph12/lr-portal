import { ElementType, useMemo } from "react";
import useAuthUser from "./useAuthUser";
import { memberRoutes, myTeamRoute, portalRoutes } from "../app-data";
import { grantedWithLeadership, hasAnyPermission } from "../helpers/permissions";

export interface PortalRoute {
    name: string;
    path: string;
    icon?: ElementType;
    // One permission, or several alternatives (any grants it).
    permission?: string | string[];
    // Also needed on top of `permission` (all of them), e.g. a report's own report_* permission.
    requires?: string[];
    children?: PortalRoute[];
}

// The menu for the signed-in user's portal, minus anything their role lacks permission for.
// Sidebar, breadcrumbs and global search all read this, so they always agree with each other.
export default function usePortalRoutes(): PortalRoute[] {
    const user = useAuthUser();
    const portal = user?.portal ?? null;
    const permissions = grantedWithLeadership(user?.permissions, user?.leads, user?.portal).join(",");
    const leads = !!(user?.leads?.teams.length || user?.leads?.sub_teams.length);

    return useMemo(() => {
        const granted = permissions.split(",");
        const allowed = (route: PortalRoute) =>
            hasAnyPermission(granted, route.permission) && (route.requires ?? []).every((p) => granted.indexOf(p) !== -1);
        const filter = (routes: PortalRoute[]): PortalRoute[] =>
            routes.filter(allowed).map((r) => ({ ...r, children: filter(r.children ?? []) }));

        // No portal (agents, team leaders, …) still get the shared dashboard.
        const routes = filter((portal ? portalRoutes[portal] : memberRoutes) as PortalRoute[]);

        // Leaders of a team or sub-team get My Team right after the dashboard.
        return leads ? [routes[0], myTeamRoute as PortalRoute, ...routes.slice(1)].filter(Boolean) : routes;
    }, [portal, permissions, leads]);
}
