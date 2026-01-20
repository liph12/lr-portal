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
} from "@mui/icons-material";

export const useAppRoutes = [
    {
        name: "Dashboard",
        path: "/superadmin/dashboard/main",
        icon: DashboardRounded,
        children: [
            {
                name: "Main",
                path: "/superadmin/dashboard/main",
                children: [],
                icon: Apps,
            },
            {
                name: "Overview",
                path: "/superadmin/dashboard/overview",
                children: [],
                icon: StorageRounded,
            },
            {
                name: "Create Sale",
                path: "/superadmin/dashboard/create-sale",
                children: [
                    {
                        name: "Project Sale",
                        path: "/superadmin/dashboard/create-sale/project",
                        children: [],
                    },
                    {
                        name: "Rental Sale",
                        path: "/superadmin/dashboard/create-sale/rental",
                        children: [],
                    },
                    {
                        name: "Brokerage Sale",
                        path: "/superadmin/dashboard/create-sale/brokerage",
                        children: [],
                    },
                ],
                icon: NoteAdd,
            },
            {
                name: "View Sales",
                path: "/superadmin/dashboard/view-sales",
                icon: BarChart,
                children: [
                    {
                        name: "Developer",
                        path: "/superadmin/dashboard/view-reports/developer",
                        children: [],
                    },
                ],
            },
        ],
    },
    {
        name: "Management",
        path: "/superadmin/management",
        icon: AdminPanelSettingsRounded,
        children: [],
    },
    {
        name: "Accounting",
        path: "/superadmin/accounting",
        icon: Payments,
        children: [],
    },
    {
        name: "Documentation",
        path: "/superadmin/documentation",
        icon: FolderShared,
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
];

export const useCreateSaleSteps = [
    "Client Details",
    "Property/Unit",
    "Upload POT",
];
