import { ElementType, useMemo } from "react";
import useAuthUser from "./useAuthUser";
import { memberRoutes, myTeamRoute, portalRoutes } from "../app-data";
import { grantedWithLeadership, hasAnyPermission } from "../helpers/permissions";

export interface PortalRoute {
    name: string;
    path: string;
    icon?: ElementType;
    // A count shown on the menu item (things waiting for the user).
    badge?: number;
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
    const permissions = grantedWithLeadership(user?.permissions, user?.leads, user?.portal, user?.office_areas, user?.global_partners, user?.agent_id, user?.nao_approvals).join(",");
    // Counters on menu items, by path (e.g. global partners waiting for confirmation).
    const partnersPending = user?.global_partners?.pending ?? 0;
    const naoPending = user?.nao_approvals?.pending ?? 0;
    const smsPending = user?.sms_credits?.pending ?? 0;
    const salesPending = user?.sales_validation?.pending ?? 0;
    const brokerageAwaiting = user?.commission_receiving?.brokerage ?? 0;
    const rentalAwaiting = user?.commission_receiving?.rental ?? 0;
    const leads = !!(user?.leads?.teams.length || user?.leads?.sub_teams.length);

    return useMemo(() => {
        const granted = permissions.split(",");
        const allowed = (route: PortalRoute) =>
            hasAnyPermission(granted, route.permission) && (route.requires ?? []).every((p) => granted.indexOf(p) !== -1);
        const badges: Record<string, number> = {
            "/global-partners": partnersPending,
            "/nao-approvals": naoPending,
            "/sms": smsPending,
            // The receivings and SMS sit inside Management (its tabs / cards show each); its menu item carries their total.
            ...Object.fromEntries(["/superadmin", "/admin", "/staff"].map((p) => [`${p}/management`, brokerageAwaiting + rentalAwaiting + smsPending])),
            // Sales validation lives in each back-office portal and, for office secretaries, at the shared path.
            ...Object.fromEntries(["/superadmin", "/admin", "/staff", ""].map((p) => [`${p}/sales-validation`, salesPending])),
        };
        const filter = (routes: PortalRoute[]): PortalRoute[] =>
            routes.filter(allowed).map((r) => ({ ...r, badge: badges[r.path] || undefined, children: filter(r.children ?? []) }));

        // No portal (agents, team leaders, …) still get the shared dashboard.
        const routes = filter((portal ? portalRoutes[portal] : memberRoutes) as PortalRoute[]);

        // Leaders of a team or sub-team get My Team right after the dashboard.
        return leads ? [routes[0], myTeamRoute as PortalRoute, ...routes.slice(1)].filter(Boolean) : routes;
    }, [portal, permissions, leads, partnersPending, naoPending, smsPending, salesPending, brokerageAwaiting, rentalAwaiting]);
}
