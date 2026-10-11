import { usePage } from "@inertiajs/react";
import type { ReactNode } from "react";
import usePortalRoutes from "./usePortalRoutes";

interface RouteItem {
    name: string;
    path: string;
    icon?: ReactNode;
    children?: RouteItem[];
}

interface Breadcrumb {
    name: string;
    path: string;
}

export default function useBreadcrumbs(): Breadcrumb[] {
    const { url } = usePage();
    const routes = usePortalRoutes();

    function findRoute(
        routes: RouteItem[],
        currentUrl: string,
        trail: Breadcrumb[] = [],
    ): Breadcrumb[] | null {
        for (const route of routes) {
            const newTrail = [...trail, { name: route.name, path: route.path }];

            if (route.path === currentUrl) {
                return newTrail;
            }

            if (route.children?.length) {
                const found = findRoute(route.children, currentUrl, newTrail);
                if (found) return found;
            }
        }

        return null;
    }

    // Filters add a query string (e.g. ?period=year); breadcrumbs match on the path alone.
    return findRoute(routes as RouteItem[], url.split("?")[0]) ?? [];
}
