import { usePage } from "@inertiajs/react";
import { isRouteActive } from "../helpers/routeMatch";
import usePortalRoutes from "./usePortalRoutes";

export default function useSidebarRoutes() {
    const { url } = usePage();
    const path = url.split("?")[0];

    return usePortalRoutes().map((route) => ({
        ...route,
        active: isRouteActive(path, route.path) || !!route.children?.some((child) => isRouteActive(path, child.path)),
    }));
}
