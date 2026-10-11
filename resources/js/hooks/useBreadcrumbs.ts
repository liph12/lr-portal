import { usePage } from "@inertiajs/react";
import type { ReactNode } from "react";
import usePortalRoutes from "./usePortalRoutes";
import { pagesOutsideMenu } from "../app-data";

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

function findRoute(routes: RouteItem[], currentUrl: string, trail: Breadcrumb[] = []): Breadcrumb[] | null {
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

const matchesPattern = (pattern: string, path: string) =>
    new RegExp(`^${pattern.replace(/:[^/]+/g, "[^/]+")}$`).test(path);

export default function useBreadcrumbs(): Breadcrumb[] {
    const { url } = usePage();
    const routes = usePortalRoutes() as RouteItem[];
    // Filters add a query string (e.g. ?period=year); breadcrumbs match on the path alone.
    const path = url.split("?")[0];

    const inMenu = findRoute(routes, path);
    if (inMenu) return inMenu;

    const page = pagesOutsideMenu.find((p) => matchesPattern(p.path, path));
    if (!page) return [];

    const parent = "parent" in page && page.parent ? findRoute(routes, page.parent) ?? [] : [];
    return [...parent, { name: page.name, path }];
}
