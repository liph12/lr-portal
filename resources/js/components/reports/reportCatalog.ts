import { ElementType } from "react";
import {
    ApartmentRounded,
    BadgeRounded,
    Diversity3Rounded,
    EmojiEventsRounded,
    GroupsRounded,
    HomeWorkRounded,
    PlaceRounded,
    StorefrontRounded,
} from "@mui/icons-material";

export interface ReportCard {
    // URL slug under /reports (ReportsController::REPORTS).
    slug: string;
    title: string;
    description: string;
    icon: ElementType;
}

// The reports offered under Reports, in the order they're shown.
export const REPORTS: ReportCard[] = [
    { slug: "top-agents", title: "Top Agents", description: "Agents ranked by total contract value across every sale type.", icon: EmojiEventsRounded },
    { slug: "top-unit-managers", title: "Top Unit Managers", description: "Unit managers ranked by their own sales.", icon: BadgeRounded },
    { slug: "top-teams", title: "Top Teams", description: "Teams ranked by their members' sales at the time of each sale.", icon: GroupsRounded },
    { slug: "top-sub-teams", title: "Top Sub-teams", description: "Sub-teams ranked by their members' sales, with their team.", icon: Diversity3Rounded },
    { slug: "area-sales", title: "Sales by Area", description: "Sales by the area agents belong to (Cebu, Metro Manila, Cagayan…), with each area's headcount.", icon: PlaceRounded },
    { slug: "developer-sales", title: "Developer Sales", description: "Project sales grouped by developer.", icon: ApartmentRounded },
    { slug: "brokerage-sales", title: "Brokerage Sales", description: "Top agents by brokerage sales.", icon: StorefrontRounded },
    { slug: "rental-sales", title: "Rental Sales", description: "Rental sales, with the agents who closed them.", icon: HomeWorkRounded },
];
