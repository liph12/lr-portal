import { ElementType, useMemo } from "react";
import useAuthUser from "./useAuthUser";
import { portalRoutes } from "../app-data";

export interface PortalRoute {
    name: string;
    path: string;
    icon?: ElementType;
    permission?: string;
    children?: PortalRoute[];
}

// The menu for the signed-in user's portal, minus anything their role lacks permission for.
// Sidebar, breadcrumbs and global search all read this, so they always agree with each other.
export default function usePortalRoutes(): PortalRoute[] {
    const user = useAuthUser();
    const portal = user?.portal ?? null;
    const permissions = user?.permissions.join(",") ?? "";

    return useMemo(() => {
        if (!portal) return [];
        const granted = permissions.split(",");
        const allowed = (route: PortalRoute) => !route.permission || granted.indexOf(route.permission) !== -1;
        const filter = (routes: PortalRoute[]): PortalRoute[] =>
            routes.filter(allowed).map((r) => ({ ...r, children: filter(r.children ?? []) }));

        return filter(portalRoutes[portal] as PortalRoute[]);
    }, [portal, permissions]);
}
