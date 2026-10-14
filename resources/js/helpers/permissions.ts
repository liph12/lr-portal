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
// An office's assigned secretary (auth.office_areas): validates and reports on that office's area.
export const SECRETARY = "_secretary";
// Sees global partners (auth.global_partners): the back office, or a sponsor who invited some.
export const PARTNERS = "_partners";
// Approves NAO attendances (auth.nao_approvals): the back office, office secretaries, leaders and sponsors with recruits.
export const NAO_APPROVER = "_nao_approver";
// Has an agent record (auth.agent_id): their own sales (My Sales).
export const AGENT = "_agent";

export function grantedWithLeadership(
    permissions: string[] | undefined,
    leads: { teams: unknown[]; sub_teams: unknown[] } | undefined,
    portal?: string | null,
    officeAreas?: string[],
    globalPartners?: { pending: number } | null,
    agentId?: number | null,
    naoApprovals?: { pending: number } | null,
): string[] {
    const granted = [...(permissions ?? [])];
    if (leads && (leads.teams.length || leads.sub_teams.length)) granted.push(LEADER);
    if (leads?.teams.length) granted.push(TEAM_LEADER);
    if (portal) granted.push(BACKOFFICE);
    if (officeAreas?.length) granted.push(SECRETARY);
    if (globalPartners) granted.push(PARTNERS);
    if (agentId) granted.push(AGENT);
    if (naoApprovals) granted.push(NAO_APPROVER);
    return granted;
}
