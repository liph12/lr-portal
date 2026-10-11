import { ElementType, useMemo } from "react";
import useAuthUser from "./useAuthUser";
import { memberRoutes, portalRoutes } from "../app-data";
import { hasAnyPermission } from "../helpers/permissions";

export interface PortalRoute {
    name: string;
    path: string;
    icon?: ElementType;
    // One permission, or several alternatives (any grants it).
    permission?: string | string[];
    children?: PortalRoute[];
}

// The menu for the signed-in user's portal, minus anything their role lacks permission for.
// Sidebar, breadcrumbs and global search all read this, so they always agree with each other.
export default function usePortalRoutes(): PortalRoute[] {
    const user = useAuthUser();
    const portal = user?.portal ?? null;
    const permissions = user?.permissions.join(",") ?? "";

    return useMemo(() => {
        const granted = permissions.split(",");
        const allowed = (route: PortalRoute) => hasAnyPermission(granted, route.permission);
        const filter = (routes: PortalRoute[]): PortalRoute[] =>
            routes.filter(allowed).map((r) => ({ ...r, children: filter(r.children ?? []) }));

        // No portal (agents, team leaders, …) still get the shared dashboard.
        return filter((portal ? portalRoutes[portal] : memberRoutes) as PortalRoute[]);
    }, [portal, permissions]);
}
