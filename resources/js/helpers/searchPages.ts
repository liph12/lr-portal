import { ElementType } from "react";
import { AccountCircleOutlined } from "@mui/icons-material";
import { useAppRoutes } from "../app-data";

export interface PageResult {
    name: string;
    path: string;
    // Parent names, e.g. "Dashboard › Record Your Sale", so same-named pages can be told apart.
    trail: string;
    icon?: ElementType;
}

interface RouteNode {
    name: string;
    path: string;
    icon?: ElementType;
    children?: RouteNode[];
}

const SHARED_PAGES: PageResult[] = [
    { name: "Edit profile", path: "/profile", trail: "Account", icon: AccountCircleOutlined },
];

function flatten(nodes: RouteNode[], parents: string[] = [], parentIcon?: ElementType): PageResult[] {
    return nodes.reduce<PageResult[]>((all, node) => {
        const icon = node.icon ?? parentIcon;
        // A child sharing its parent's path (Dashboard › Main) would be a duplicate result.
        const isDuplicate = parents.length > 0 && all.some((p) => p.path === node.path);
        if (!isDuplicate) all.push({ name: node.name, path: node.path, trail: parents.join(" › "), icon });
        return all.concat(flatten(node.children ?? [], [...parents, node.name], icon));
    }, []);
}

// The sidebar routes all live under /superadmin, so they're only offered to superadmins.
export function buildPageIndex(canAccessSuperadmin: boolean): PageResult[] {
    const portal = canAccessSuperadmin ? flatten(useAppRoutes as RouteNode[]) : [];
    return [...portal, ...SHARED_PAGES];
}

export function searchPages(index: PageResult[], query: string, limit = 6): PageResult[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return index
        .map((page) => {
            const name = page.name.toLowerCase();
            const score = name.indexOf(q) === 0
                ? 0
                : name.indexOf(q) !== -1
                  ? 1
                  : page.trail.toLowerCase().indexOf(q) !== -1
                    ? 2
                    : page.path.toLowerCase().indexOf(q) !== -1
                      ? 3
                      : -1;
            return { page, score };
        })
        .filter((r) => r.score >= 0)
        .sort((a, b) => a.score - b.score || a.page.name.length - b.page.name.length)
        .slice(0, limit)
        .map((r) => r.page);
}
