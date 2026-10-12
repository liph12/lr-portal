import { ElementType } from "react";
import { Diversity3Rounded, EmojiEventsRounded, GroupsRounded, HomeWorkRounded, StorefrontRounded, WorkspacesRounded } from "@mui/icons-material";

// The NATCON boards in the order shown (slugs = NatconService::BOARDS); the menu's children for breadcrumbs and search.
export const NATCON_BOARDS: { slug: string; title: string; icon: ElementType }[] = [
    { slug: "qualifiers", title: "NATCON Qualifiers", icon: EmojiEventsRounded },
    { slug: "top-teams", title: "Top Teams", icon: GroupsRounded },
    { slug: "top-brokerage-sales", title: "Top Brokerage Sales", icon: StorefrontRounded },
    { slug: "top-rent-managers", title: "Top Rent Managers", icon: HomeWorkRounded },
    { slug: "top-brokerage-teams", title: "Top Brokerage Teams", icon: WorkspacesRounded },
    { slug: "top-sub-teams", title: "Top Sub-Teams", icon: Diversity3Rounded },
];
