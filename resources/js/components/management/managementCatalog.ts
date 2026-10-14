import { ElementType } from "react";
import { SpotName } from "../utils/SpotIcon";
import { BadgeRounded, Diversity3Rounded, GroupsRounded, KeyRounded, MoveToInboxRounded, SwapHorizRounded } from "@mui/icons-material";

// Management's sections, in order: its tabs, its cards (Overview) and its menu children.
export interface ManagementSection {
    name: string;
    // Inside the portal's /management, or a shared page of its own (the receivings).
    href: (base: string) => string;
    icon: ElementType;
    // The card's illustration (tabs and menus keep the flat icon).
    art: SpotName;
    description: string;
    // Any of these (Management's own, or the receiving permission).
    permission: string[];
}

export const MANAGEMENT_PERMISSIONS = ["edit_designation", "transfer_agents", "change_agent_status", "edit_teams", "change_team_status"];

export const MANAGEMENT_SECTIONS: ManagementSection[] = [
    { name: "Agents", href: (b) => `${b}/agents`, icon: BadgeRounded, art: "id-card", description: "Designations, status, photos and transfers, agent by agent.", permission: MANAGEMENT_PERMISSIONS },
    { name: "Teams", href: (b) => `${b}/teams`, icon: GroupsRounded, art: "team", description: "Create and edit teams, their leaders, logos and status.", permission: MANAGEMENT_PERMISSIONS },
    { name: "Sub-teams", href: (b) => `${b}/sub-teams`, icon: Diversity3Rounded, art: "sub-team", description: "Unit managers' sub-teams inside each team.", permission: MANAGEMENT_PERMISSIONS },
    { name: "Team transfers", href: (b) => `${b}/transfers`, icon: SwapHorizRounded, art: "transfer", description: "Who moved between teams and sub-teams, and when.", permission: MANAGEMENT_PERMISSIONS },
    { name: "Brokerage receiving", href: () => "/brokerage-receiving", icon: MoveToInboxRounded, art: "inbox", description: "Sign for brokerage commission slips; receiving validates the sale.", permission: ["receive_brokerage_sales"] },
    { name: "Rental receiving", href: () => "/rental-receiving", icon: KeyRounded, art: "key", description: "Sign for Rent.ph rental commission slips; receiving validates the sale.", permission: ["receive_rental_sales"] },
];
