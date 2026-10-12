import {
    DashboardRounded,
    AdminPanelSettingsRounded,
    Payments,
    FolderShared,
    PersonSearch,
    StorageRounded,
    NoteAdd,
    BarChart,
    Apps,
    InboxRounded,
    SettingsRounded,
    BarChartRounded,
    AssessmentRounded,
    Diversity3Rounded,
    FactCheckRounded,
    PublicRounded,
    ReceiptLongRounded,
    AccountTreeRounded,
    EmojiEventsRounded,
    MoveToInboxRounded,
    KeyRounded,
} from "@mui/icons-material";
import { REPORTS } from "./components/reports/reportCatalog";
import { NATCON_BOARDS } from "./components/natcon/natconCatalog";
import { AGENT, BACKOFFICE, LEADER, PARTNERS, SECRETARY, TEAM_LEADER } from "./helpers/permissions";

// The dashboard is the same for every role (shared /dashboard routes); Record Your Sale needs a recording permission.
export const dashboardRoute = {
    name: "Dashboard",
    path: "/dashboard/main",
    icon: DashboardRounded,
    children: [
        {
            name: "Main",
            path: "/dashboard/main",
            children: [],
            icon: Apps,
        },
        {
            name: "Overview",
            path: "/dashboard/overview",
            // Members and recruits: the back office (everyone) and leaders (their team / sub-team).
            permission: ["_backoffice", "_leader"],
            children: [],
            icon: StorageRounded,
        },
        {
            name: "My Sales",
            path: "/dashboard/my-sales",
            // Anyone with an agent record: their own sales, one by one.
            permission: AGENT,
            children: [],
            icon: ReceiptLongRounded,
        },
        {
            name: "Record Your Sale",
            path: "/dashboard/record-sale",
            // Any of these: local roles record project/rental/brokerage, global partners international.
            permission: ["record_sales", "record_international_sales"],
            // Opened from the sidebar's Record Your Sale button; kept here for breadcrumbs and search.
            tab: false,
            children: [
                {
                    name: "Project Sale",
                    path: "/dashboard/record-sale/project",
                    permission: "record_sales",
                    children: [],
                },
                {
                    name: "Rental Sale",
                    path: "/dashboard/record-sale/rental",
                    permission: "record_sales",
                    children: [],
                },
                {
                    name: "Brokerage Sale",
                    path: "/dashboard/record-sale/brokerage",
                    permission: "record_sales",
                    children: [],
                },
                {
                    name: "International Sale",
                    path: "/dashboard/record-sale/international",
                    permission: "record_international_sales",
                    children: [],
                },
            ],
            icon: NoteAdd,
        },
        {
            name: "View Sales",
            path: "/dashboard/view-sales",
            icon: BarChart,
            // Everything for view_reports; a leader's own team for team leaders / unit managers (server-scoped).
            permission: ["view_reports", "_leader"],
            children: [],
        },
    ],
};

// Global partners: the back office sees every partner, a sponsor their own invites; the badge counts those waiting
// for confirmation (usePortalRoutes). Their statistics are international sales only, apart from the local reports.
// The recruit tree: everyone's own downline; back office and office secretaries can open anyone's in reach.
export const genealogyRoute = {
    name: "Genealogy",
    path: "/genealogy",
    icon: AccountTreeRounded,
    permission: "view_genealogy",
    children: [],
};

// The NATCON rankings for the convention period set in Settings › NATCON: the back office every board, leaders who
// qualified on the group they lead (NatconService::reach).
export const natconRoute = {
    name: "NATCON",
    path: "/natcon",
    icon: EmojiEventsRounded,
    permission: [BACKOFFICE, LEADER],
    requires: ["view_natcon"],
    children: NATCON_BOARDS.map((b) => ({ name: b.title, path: `/natcon/${b.slug}`, ...(b.slug === "qualifiers" ? {} : { permission: BACKOFFICE }), children: [] })),
};

// Commission slips waiting to be received and signed for — brokerage and rental separately, each its own permission
// (shared pages; secretaries see their areas).
export const brokerageReceivingRoute = {
    name: "Brokerage receiving",
    path: "/brokerage-receiving",
    icon: MoveToInboxRounded,
    permission: "receive_brokerage_sales",
    children: [],
};

export const rentalReceivingRoute = {
    name: "Rental receiving",
    path: "/rental-receiving",
    icon: KeyRounded,
    permission: "receive_rental_sales",
    children: [],
};

export const globalPartnersRoute = {
    name: "Global Partners",
    path: "/global-partners",
    icon: PublicRounded,
    permission: PARTNERS,
    children: [
        { name: "Partners", path: "/global-partners", children: [] },
        { name: "Statistics", path: "/global-partners/statistics", permission: "view_global_partner_statistics", children: [] },
    ],
};

// Who may open a report beyond Reports itself (ReportsController::available): Top Teams only with the whole system in
// reach, Top Sub-teams also inside a team. Recruits follow Reports (an agent sees the recruits they sponsored).
const REPORT_ACCESS: Record<string, string[]> = {
    "top-teams": [BACKOFFICE],
    "top-sub-teams": [BACKOFFICE, TEAM_LEADER],
};

// Shared by every portal (/reports); what each person sees is limited server-side (TeamLeadershipService::reportScope).
// The children feed breadcrumbs and search only; the sidebar shows top-level items.
export const reportsRoute = {
    name: "Reports",
    path: "/reports",
    icon: AssessmentRounded,
    permission: ["view_reports", LEADER],
    children: REPORTS.map((r) => ({
        name: r.title,
        path: `/reports/${r.slug}`,
        permission: REPORT_ACCESS[r.slug],
        // Each report is also its own permission (ReportsController::permission).
        requires: [`report_${r.slug.replace(/-/g, "_")}`],
        children: [],
    })),
};

// The same Management pages serve /superadmin/management and /admin/management (tabs in ManagementLayout).
// Any of them opens Management (TeamPolicy::manage); each change needs its own (Permission::MANAGEMENT).
const MANAGEMENT_PERMISSIONS = ["edit_designation", "transfer_agents", "change_agent_status", "edit_teams", "change_team_status"];

const managementRoute = (base: string) => ({
    name: "Management",
    path: base,
    icon: AdminPanelSettingsRounded,
    permission: MANAGEMENT_PERMISSIONS,
    children: [
        { name: "Agents", path: `${base}/agents`, children: [] },
        { name: "Teams", path: `${base}/teams`, children: [] },
        { name: "Sub-teams", path: `${base}/sub-teams`, children: [] },
        { name: "Team transfers", path: `${base}/transfers`, children: [] },
    ],
});

export const useAppRoutes = [
    dashboardRoute,
    managementRoute("/superadmin/management"),
    reportsRoute,
    natconRoute,
    globalPartnersRoute,
    genealogyRoute,
    {
        name: "Statistics",
        path: "/superadmin/statistics",
        icon: BarChartRounded,
        permission: "view_statistics",
        children: [],
    },
    {
        name: "Accounting",
        path: "/superadmin/accounting",
        icon: Payments,
        children: [],
    },
    { name: "Sales validation", path: "/superadmin/sales-validation", icon: FactCheckRounded, permission: "sales_validation", children: [] },
    brokerageReceivingRoute,
    rentalReceivingRoute,
    {
        name: "Documentation",
        path: "/superadmin/documentation",
        icon: FolderShared,
        permission: "manage_documents",
        children: [],
    },
    {
        name: "Human Resource",
        path: "/superadmin/human-resource",
        icon: PersonSearch,
        children: [],
    },
    {
        name: "Inbox",
        path: "/superadmin/inbox",
        icon: InboxRounded,
        children: [],
    },
    {
        name: "Settings",
        path: "/superadmin/settings",
        icon: SettingsRounded,
        children: [
            {
                name: "Roles & permissions",
                path: "/superadmin/settings/roles",
                children: [],
            },
            {
                name: "Sales cutoff",
                path: "/superadmin/settings/sales-cutoffs",
                children: [],
            },
            {
                name: "NATCON",
                path: "/superadmin/settings/natcon",
                children: [],
            },
            {
                name: "Preferences",
                path: "/settings/preferences",
                permission: "use_preferences",
                children: [],
            },
        ],
    },
];

// Everyone else's Settings: just their own Preferences (theme, text size, where links open).
export const settingsRoute = {
    name: "Settings",
    path: "/settings/preferences",
    icon: SettingsRounded,
    permission: "use_preferences",
    children: [{ name: "Preferences", path: "/settings/preferences", permission: "use_preferences", children: [] }],
};

// Admin and staff menus. `permission` hides an item (and the route enforces the same gate) unless the
// user's role has it — manage this in Settings › Roles & permissions.
export const adminRoutes = [
    dashboardRoute,
    managementRoute("/admin/management"),
    reportsRoute,
    natconRoute,
    globalPartnersRoute,
    genealogyRoute,
    { name: "Statistics", path: "/admin/statistics", icon: BarChartRounded, permission: "view_statistics", children: [] },
    { name: "Sales validation", path: "/admin/sales-validation", icon: FactCheckRounded, permission: "sales_validation", children: [] },
    brokerageReceivingRoute,
    rentalReceivingRoute,
    { name: "Documentation", path: "/admin/documentation", icon: FolderShared, permission: "manage_documents", children: [] },
    settingsRoute,
];

export const staffRoutes = [
    dashboardRoute,
    managementRoute("/staff/management"),
    reportsRoute,
    natconRoute,
    globalPartnersRoute,
    genealogyRoute,
    { name: "Statistics", path: "/staff/statistics", icon: BarChartRounded, permission: "view_statistics", children: [] },
    { name: "Sales validation", path: "/staff/sales-validation", icon: FactCheckRounded, permission: "sales_validation", children: [] },
    brokerageReceivingRoute,
    rentalReceivingRoute,
    { name: "Documentation", path: "/staff/documentation", icon: FolderShared, permission: "manage_documents", children: [] },
    settingsRoute,
];

// Added to any menu for people who lead a team or sub-team (usePortalRoutes checks auth.leads).
export const myTeamRoute = {
    name: "My Team",
    path: "/my-team",
    icon: Diversity3Rounded,
    children: [
        { name: "Overview", path: "/my-team", children: [] },
        { name: "Members", path: "/my-team/members", children: [] },
        { name: "Recruits", path: "/my-team/recruits", children: [] },
        // Unit managers only monitor; managing sub-teams is for team leaders.
        { name: "Sub-teams", path: "/my-team/sub-teams", permission: TEAM_LEADER, children: [] },
    ],
};

// Pages opened from inside other pages rather than the menu: breadcrumbs only. `:param` matches one path segment;
// `parent` is the menu path they sit under (left out when the reader's menu doesn't have it).
export const pagesOutsideMenu = [
    { name: "Agent profile", path: "/agents/:agent", parent: "/reports" },
    { name: "Edit profile", path: "/profile" },
];

// Roles without a portal (agents, team leaders, unit managers, secretaries, …): the dashboard and reports; an office's
// secretary also validates that office's sales (shared /sales-validation).
export const memberRoutes = [
    dashboardRoute,
    reportsRoute,
    natconRoute,
    globalPartnersRoute,
    genealogyRoute,
    { name: "Sales validation", path: "/sales-validation", icon: FactCheckRounded, permission: SECRETARY, requires: ["sales_validation"], children: [] },
    settingsRoute,
];

export const portalRoutes = {
    superadmin: useAppRoutes,
    admin: adminRoutes,
    staff: staffRoutes,
};

export const useRecordSaleSteps = [
    "Client Details",
    "Property/Unit",
    "Upload POT",
];

// Rental and brokerage sales upload a remittance slip (and optionally a deposit slip) instead of a POT.
// Brokerage and rental: the commission slip is generated, so the last step uploads the contract and photos instead.
export const useCommissionSaleSteps = ["Client Details", "Property & Commission", "Upload Files"];

export const condoTypes = [
    { id: 1, label: "Studio" },
    { id: 2, label: "Parking" },
    { id: 3, label: "1 Bedroom" },
    { id: 4, label: "2 Bedroom" },
    { id: 5, label: "3 Bedroom" },
    { id: 6, label: "Loft" },
    { id: 7, label: "Penthouse" },
];

export const commissionStatus = [
    {
        id: 1,
        label: "Unclaimed",
    },
    {
        id: 2,
        label: "Partially Claimed",
    },
    {
        id: 3,
        label: "Fully Claimed",
    },
];

export const countries = [
    { id: "AF", label: "Afghanistan" },
    { id: "AL", label: "Albania" },
    { id: "DZ", label: "Algeria" },
    { id: "AD", label: "Andorra" },
    { id: "AO", label: "Angola" },
    { id: "AG", label: "Antigua and Barbuda" },
    { id: "AR", label: "Argentina" },
    { id: "AM", label: "Armenia" },
    { id: "AU", label: "Australia" },
    { id: "AT", label: "Austria" },
    { id: "AZ", label: "Azerbaijan" },
    { id: "BS", label: "Bahamas" },
    { id: "BH", label: "Bahrain" },
    { id: "BD", label: "Bangladesh" },
    { id: "BB", label: "Barbados" },
    { id: "BY", label: "Belarus" },
    { id: "BE", label: "Belgium" },
    { id: "BZ", label: "Belize" },
    { id: "BJ", label: "Benin" },
    { id: "BT", label: "Bhutan" },
    { id: "BO", label: "Bolivia" },
    { id: "BA", label: "Bosnia and Herzegovina" },
    { id: "BW", label: "Botswana" },
    { id: "BR", label: "Brazil" },
    { id: "BN", label: "Brunei" },
    { id: "BG", label: "Bulgaria" },
    { id: "BF", label: "Burkina Faso" },
    { id: "BI", label: "Burundi" },
    { id: "KH", label: "Cambodia" },
    { id: "CM", label: "Cameroon" },
    { id: "CA", label: "Canada" },
    { id: "CV", label: "Cape Verde" },
    { id: "CF", label: "Central African Republic" },
    { id: "TD", label: "Chad" },
    { id: "CL", label: "Chile" },
    { id: "CN", label: "China" },
    { id: "CO", label: "Colombia" },
    { id: "KM", label: "Comoros" },
    { id: "CG", label: "Congo" },
    { id: "CR", label: "Costa Rica" },
    { id: "HR", label: "Croatia" },
    { id: "CU", label: "Cuba" },
    { id: "CY", label: "Cyprus" },
    { id: "CZ", label: "Czech Republic" },
    { id: "DK", label: "Denmark" },
    { id: "DJ", label: "Djibouti" },
    { id: "DM", label: "Dominica" },
    { id: "DO", label: "Dominican Republic" },
    { id: "EC", label: "Ecuador" },
    { id: "EG", label: "Egypt" },
    { id: "SV", label: "El Salvador" },
    { id: "GQ", label: "Equatorial Guinea" },
    { id: "ER", label: "Eritrea" },
    { id: "EE", label: "Estonia" },
    { id: "ET", label: "Ethiopia" },
    { id: "FJ", label: "Fiji" },
    { id: "FI", label: "Finland" },
    { id: "FR", label: "France" },
    { id: "GA", label: "Gabon" },
    { id: "GM", label: "Gambia" },
    { id: "GE", label: "Georgia" },
    { id: "DE", label: "Germany" },
    { id: "GH", label: "Ghana" },
    { id: "GR", label: "Greece" },
    { id: "GD", label: "Grenada" },
    { id: "GT", label: "Guatemala" },
    { id: "GN", label: "Guinea" },
    { id: "GW", label: "Guinea-Bissau" },
    { id: "GY", label: "Guyana" },
    { id: "HT", label: "Haiti" },
    { id: "HN", label: "Honduras" },
    { id: "HK", label: "Hong Kong" },
    { id: "MO", label: "Macau" },
    { id: "HU", label: "Hungary" },
    { id: "IS", label: "Iceland" },
    { id: "IN", label: "India" },
    { id: "ID", label: "Indonesia" },
    { id: "IR", label: "Iran" },
    { id: "IQ", label: "Iraq" },
    { id: "IE", label: "Ireland" },
    { id: "IL", label: "Israel" },
    { id: "IT", label: "Italy" },
    { id: "JM", label: "Jamaica" },
    { id: "JP", label: "Japan" },
    { id: "JO", label: "Jordan" },
    { id: "KZ", label: "Kazakhstan" },
    { id: "KE", label: "Kenya" },
    { id: "KI", label: "Kiribati" },
    { id: "KW", label: "Kuwait" },
    { id: "KG", label: "Kyrgyzstan" },
    { id: "LA", label: "Laos" },
    { id: "LV", label: "Latvia" },
    { id: "LB", label: "Lebanon" },
    { id: "LS", label: "Lesotho" },
    { id: "LR", label: "Liberia" },
    { id: "LY", label: "Libya" },
    { id: "LI", label: "Liechtenstein" },
    { id: "LT", label: "Lithuania" },
    { id: "LU", label: "Luxembourg" },
    { id: "MG", label: "Madagascar" },
    { id: "MW", label: "Malawi" },
    { id: "MY", label: "Malaysia" },
    { id: "MV", label: "Maldives" },
    { id: "ML", label: "Mali" },
    { id: "MT", label: "Malta" },
    { id: "MH", label: "Marshall Islands" },
    { id: "MR", label: "Mauritania" },
    { id: "MU", label: "Mauritius" },
    { id: "MX", label: "Mexico" },
    { id: "FM", label: "Micronesia" },
    { id: "MD", label: "Moldova" },
    { id: "MC", label: "Monaco" },
    { id: "MN", label: "Mongolia" },
    { id: "ME", label: "Montenegro" },
    { id: "MA", label: "Morocco" },
    { id: "MZ", label: "Mozambique" },
    { id: "MM", label: "Myanmar" },
    { id: "NA", label: "Namibia" },
    { id: "NR", label: "Nauru" },
    { id: "NP", label: "Nepal" },
    { id: "NL", label: "Netherlands" },
    { id: "NZ", label: "New Zealand" },
    { id: "NI", label: "Nicaragua" },
    { id: "NE", label: "Niger" },
    { id: "NG", label: "Nigeria" },
    { id: "NO", label: "Norway" },
    { id: "OM", label: "Oman" },
    { id: "PK", label: "Pakistan" },
    { id: "PA", label: "Panama" },
    { id: "PG", label: "Papua New Guinea" },
    { id: "PY", label: "Paraguay" },
    { id: "PE", label: "Peru" },
    { id: "PH", label: "Philippines" },
    { id: "PL", label: "Poland" },
    { id: "PT", label: "Portugal" },
    { id: "QA", label: "Qatar" },
    { id: "RO", label: "Romania" },
    { id: "RU", label: "Russia" },
    { id: "RW", label: "Rwanda" },
    { id: "SA", label: "Saudi Arabia" },
    { id: "SN", label: "Senegal" },
    { id: "RS", label: "Serbia" },
    { id: "SG", label: "Singapore" },
    { id: "SK", label: "Slovakia" },
    { id: "SI", label: "Slovenia" },
    { id: "SB", label: "Solomon Islands" },
    { id: "SO", label: "Somalia" },
    { id: "ZA", label: "South Africa" },
    { id: "KR", label: "South Korea" },
    { id: "ES", label: "Spain" },
    { id: "LK", label: "Sri Lanka" },
    { id: "SE", label: "Sweden" },
    { id: "CH", label: "Switzerland" },
    { id: "SY", label: "Syria" },
    { id: "TW", label: "Taiwan" },
    { id: "TH", label: "Thailand" },
    { id: "TR", label: "Turkey" },
    { id: "UA", label: "Ukraine" },
    { id: "AE", label: "United Arab Emirates" },
    { id: "GB", label: "United Kingdom" },
    { id: "US", label: "United States" },
    { id: "UY", label: "Uruguay" },
    { id: "UZ", label: "Uzbekistan" },
    { id: "VE", label: "Venezuela" },
    { id: "VN", label: "Vietnam" },
    { id: "YE", label: "Yemen" },
    { id: "ZM", label: "Zambia" },
    { id: "ZW", label: "Zimbabwe" },
];
