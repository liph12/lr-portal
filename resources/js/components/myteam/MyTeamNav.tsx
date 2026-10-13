import { Box, MenuItem, TextField } from "@mui/material";
import { AccountTreeRounded, ArrowBackRounded, BadgeRounded, InsightsRounded, SchoolRounded } from "@mui/icons-material";
import { Link, router, usePage } from "@inertiajs/react";
import StyledButton from "../utils/StyledButton";
import useAuthUser from "../../hooks/useAuthUser";

export interface MyTeamGroup {
    type: "team" | "sub_team";
    id: number;
    name: string;
    logo: string | null;
    // The parent team, for a sub-team.
    team: string | null;
    // Set when a team leader opened one of their team's sub-teams.
    parent?: { id: number; name: string } | null;
}

// "?team=12" or "?sub_team=40": which of the user's groups a My Team page is about.
export const groupQuery = (g: Pick<MyTeamGroup, "type" | "id">) => `${g.type === "team" ? "team" : "sub_team"}=${g.id}`;

interface MyTeamNavProps {
    group: MyTeamGroup;
    isTeam: boolean;
}

// Tabs for My Team, plus a switcher when the user leads more than one team / sub-team.
export default function MyTeamNav({ group, isTeam }: MyTeamNavProps) {
    const leads = useAuthUser()?.leads ?? { teams: [], sub_teams: [] };
    const path = usePage().url.split("?")[0];
    const q = groupQuery(group);

    const tabs = [
        { name: "Overview", path: "/my-team", icon: InsightsRounded },
        { name: "Members", path: "/my-team/members", icon: BadgeRounded },
        { name: "Recruits", path: "/my-team/recruits", icon: SchoolRounded },
        ...(isTeam ? [{ name: "Sub-teams", path: "/my-team/sub-teams", icon: AccountTreeRounded }] : []),
    ];
    const options = [
        ...leads.teams.map((t) => ({ value: `team=${t.id}`, label: `${t.name} (team)` })),
        ...leads.sub_teams.map((s) => ({ value: `sub_team=${s.id}`, label: `${s.name} (sub-team${s.team ? ` of ${s.team}` : ""})` })),
    ];
    if (!options.some((o) => o.value === q)) options.push({ value: q, label: `${group.name} (sub-team of ${group.team ?? "your team"})` });

    return (
        <Box sx={{ mb: 3 }}>
            {group.parent && (
                <Link href={`/my-team/sub-teams?team=${group.parent.id}`} style={{ textDecoration: "none" }}>
                    <StyledButton size="small" variant="text" startIcon={<ArrowBackRounded />} sx={{ mb: 1, px: 1, color: "var(--lr-primary)" }}>
                        {group.parent.name}'s sub-teams
                    </StyledButton>
                </Link>
            )}
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
                <Box component="nav" aria-label="My Team sections" sx={{ display: "flex", gap: 1, flex: 1, overflowX: "auto", scrollbarWidth: "none" }}>
                    {tabs.map((t) => {
                        const active = path === t.path;
                        return (
                            <Link key={t.path} href={`${t.path}?${q}`} style={{ textDecoration: "none" }} aria-current={active ? "page" : undefined}>
                                <StyledButton
                                    startIcon={<t.icon />}
                                    size="small"
                                    variant="text"
                                    sx={{
                                        borderRadius: 99,
                                        px: 2,
                                        whiteSpace: "nowrap",
                                        fontWeight: 500,
                                        color: active ? "var(--lr-primary)" : "var(--lr-text-secondary)",
                                        backgroundColor: active ? "var(--lr-primary-soft)" : "transparent",
                                        ":hover": { backgroundColor: active ? "var(--lr-primary-soft)" : "var(--lr-surface-container)" },
                                    }}
                                >
                                    {t.name}
                                </StyledButton>
                            </Link>
                        );
                    })}
                </Box>
                {options.length > 1 && (
                    <TextField
                        select
                        size="small"
                        label="Showing"
                        value={q}
                        onChange={(e) => router.visit(`${path}?${e.target.value}`)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ minWidth: 220, "& .MuiOutlinedInput-root": { borderRadius: 99, backgroundColor: "var(--lr-surface-container)", fontSize: 14 }, "& fieldset": { border: "none" } }}
                    >
                        {options.map((o) => (
                            <MenuItem key={o.value} value={o.value}>
                                {o.label}
                            </MenuItem>
                        ))}
                    </TextField>
                )}
            </Box>
        </Box>
    );
}
