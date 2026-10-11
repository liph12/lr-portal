import { ElementType } from "react";
import { AccountCircleOutlined } from "@mui/icons-material";

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

function flatten(nodes: RouteNode[], parents: string[] = [], parentIcon?: ElementType, parentPath?: string): PageResult[] {
    return nodes.reduce<PageResult[]>((all, node) => {
        const icon = node.icon ?? parentIcon;
        // A child sharing its parent's path (Dashboard › Main, Management › Teams) would be a duplicate result.
        if (node.path !== parentPath) all.push({ name: node.name, path: node.path, trail: parents.join(" › "), icon });
        return all.concat(flatten(node.children ?? [], [...parents, node.name], icon, node.path));
    }, []);
}

// `routes` is the user's own portal menu (already permission-filtered), so search never offers a
// page they'd be refused.
export function buildPageIndex(routes: RouteNode[]): PageResult[] {
    return [...flatten(routes), ...SHARED_PAGES];
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
