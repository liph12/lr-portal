import { ElementType } from "react";
import { SpotName } from "../utils/SpotIcon";
import {
    ApartmentRounded,
    BadgeRounded,
    Diversity3Rounded,
    EmojiEventsRounded,
    GroupsRounded,
    HomeWorkRounded,
    PlaceRounded,
    SchoolRounded,
    TrendingUpRounded,
    StorefrontRounded,
    MilitaryTechRounded,
    MapRounded,
} from "@mui/icons-material";

export interface ReportCard {
    // URL slug under /reports (ReportsController::REPORTS, or "recruits").
    slug: string;
    title: string;
    description: string;
    icon: ElementType;
    // The card's illustration (tabs and menus keep the flat icon).
    art: SpotName;
}

// The reports offered under Reports, in the order they're shown.
export const REPORTS: ReportCard[] = [
    { slug: "recruits", title: "Recruits", description: "Members by status, new recruits, and NAO / FIRE progress of new sign-ups.", icon: SchoolRounded, art: "graduation" },
    { slug: "recruits-progress", title: "Recruits Progress", description: "Recruits vs recruits who sold, their sales, NAO and FIRE — by team, unit manager or sponsor.", icon: TrendingUpRounded, art: "chart-up" },
    { slug: "top-agents", title: "Top Agents", description: "Agents ranked by total contract value across every sale type.", icon: EmojiEventsRounded, art: "trophy" },
    { slug: "top-unit-managers", title: "Top Unit Managers", description: "Unit managers ranked by their own sales.", icon: BadgeRounded, art: "medal" },
    { slug: "top-team-leaders", title: "Top Team Leaders", description: "Team leaders ranked by their own (personal) sales.", icon: MilitaryTechRounded, art: "star-badge" },
    { slug: "top-teams", title: "Top Teams", description: "Teams ranked by their members' sales at the time of each sale.", icon: GroupsRounded, art: "crown-team" },
    { slug: "top-sub-teams", title: "Top Sub-teams", description: "Sub-teams ranked by their members' sales, with their team.", icon: Diversity3Rounded, art: "sub-team" },
    { slug: "area-sales", title: "Sales by Branch", description: "Sales by the branch agents belong to (Cebu, Metro Manila, Cagayan…), with each branch's headcount.", icon: PlaceRounded, art: "map-pin" },
    { slug: "developer-sales", title: "Developer Sales", description: "Project sales grouped by developer.", icon: ApartmentRounded, art: "buildings" },
    { slug: "area-developers", title: "Developers by Branch", description: "Top developers in a branch; open one to see the agents who sold it there.", icon: MapRounded, art: "map" },
    { slug: "brokerage-sales", title: "Brokerage Sales", description: "Top agents by brokerage sales.", icon: StorefrontRounded, art: "for-sale" },
    { slug: "rental-sales", title: "Rental Sales", description: "Rental sales, with the agents who closed them.", icon: HomeWorkRounded, art: "house-key" },
];
