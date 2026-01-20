import { usePage } from "@inertiajs/react";
import { isRouteActive } from "../helpers/routeMatch";
import { useAppRoutes } from "../appdata";

export default function useSidebarRoutes() {
    const { url } = usePage();

    return useAppRoutes.map((route) => {
        const active =
            isRouteActive(url, route.path) ||
            route.children?.some((child) => isRouteActive(url, child.path));

        return {
            ...route,
            active,
        };
    });
}
