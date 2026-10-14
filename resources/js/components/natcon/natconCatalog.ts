import { ElementType } from "react";
import { SpotName } from "../utils/SpotIcon";
import NatconTrophyIcon from "./NatconTrophyIcon";
import { Diversity3Rounded, GroupsRounded, HomeWorkRounded, StorefrontRounded, WorkspacesRounded } from "@mui/icons-material";

// The NATCON boards in the order shown (slugs = NatconService::BOARDS); the menu's children for breadcrumbs and search.
export const NATCON_BOARDS: { slug: string; title: string; icon: ElementType; art: SpotName }[] = [
    { slug: "qualifiers", title: "NATCON Qualifiers", icon: NatconTrophyIcon, art: "star-trophy" },
    { slug: "top-teams", title: "Top Teams", icon: GroupsRounded, art: "crown-team" },
    { slug: "top-brokerage-sales", title: "Top Brokerage Sales", icon: StorefrontRounded, art: "for-sale" },
    { slug: "top-rent-managers", title: "Top Rent Managers", icon: HomeWorkRounded, art: "house-key" },
    { slug: "top-brokerage-teams", title: "Top Brokerage Teams", icon: WorkspacesRounded, art: "team" },
    { slug: "top-sub-teams", title: "Top Sub-Teams", icon: Diversity3Rounded, art: "sub-team" },
];
