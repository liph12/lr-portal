// A route/menu `permission` may be one name or a list of alternatives (any of them grants it).
export function hasAnyPermission(granted: string[] | undefined, required: string | string[] | undefined): boolean {
    if (!required) return true;
    const list = Array.isArray(required) ? required : [required];

    return list.some((p) => (granted ?? []).indexOf(p) !== -1);
}

export const RECORD_PERMISSIONS = ["record_sales", "record_international_sales"];

// Not real permissions, only for menus: "_leader" for anyone who leads a team or sub-team (auth.leads), "_team_leader"
// for those who lead a whole team, "_backoffice" for the superadmin / admin / staff portals. The server decides what
// each person actually sees.
export const LEADER = "_leader";
export const TEAM_LEADER = "_team_leader";
export const BACKOFFICE = "_backoffice";

export function grantedWithLeadership(
    permissions: string[] | undefined,
    leads: { teams: unknown[]; sub_teams: unknown[] } | undefined,
    portal?: string | null,
): string[] {
    const granted = [...(permissions ?? [])];
    if (leads && (leads.teams.length || leads.sub_teams.length)) granted.push(LEADER);
    if (leads?.teams.length) granted.push(TEAM_LEADER);
    if (portal) granted.push(BACKOFFICE);
    return granted;
}
