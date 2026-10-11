export interface KeyValue {
    name: "string";
    value: "string";
}

export interface AutoCompleteValue {
    id: number | string;
    label: string;
}

// Laravel keys nested errors by dot path (e.g. "files.0"), so errors are looked up by string.
export type FormErrors = Partial<Record<string, string>>;

export interface SaleStepProps<T> {
    data: T;
    setData: <K extends keyof T>(key: K, value: T[K]) => void;
    errors: FormErrors;
}

export type LinkMode = "spa" | "tab";

// Where links open: `sections` maps a top-level menu path to a mode; others follow `default`.
export interface LinkPreferences {
    default: LinkMode;
    sections: Record<string, LinkMode>;
}

export type ThemeMode = "light" | "dark" | "system";
export type FontSize = "small" | "default" | "large" | "xlarge";

// Settings › Preferences. `theme` null = not chosen yet (the device's own choice stays).
export interface UserPreferences {
    theme: ThemeMode | null;
    font_size: FontSize;
    links: LinkPreferences;
}

export interface AuthUser {
    id: number;
    name: string;
    first_name: string;
    agent_id: number | null;
    // Null without the use_preferences permission: everything stays at its default.
    preferences: UserPreferences | null;
    email: string;
    role: string | null;
    avatar: string | null;
    portal: "superadmin" | "admin" | "staff" | null;
    home: string;
    permissions: string[];
    // Label of the role a superadmin is previewing, else null; view_as_roles is filled only for real superadmins.
    viewing_as: string | null;
    // Set while a superadmin is signed in as this user.
    impersonator: { id: number; name: string } | null;
    // Teams / sub-teams this user leads (My Team).
    leads: { teams: { id: number; name: string }[]; sub_teams: { id: number; name: string; team: string | null }[] };
    // Area names of the offices this user is the secretary of (empty for everyone else).
    office_areas: string[];
    // Null when the user sees no global partners (not back office, never invited one); pending = waiting to be confirmed.
    global_partners: { pending: number } | null;
    // Pending sales this user can validate (menu badge); null when they don't validate sales.
    sales_validation: { pending: number } | null;
    view_as_roles: { name: string; label: string }[];
    can: {
        access_superadmin: boolean;
        search_users: boolean;
        manage_users: boolean;
        search_groups: boolean;
        view_leaderboards: boolean;
        view_as: boolean;
        manage_teams: boolean;
        impersonate: boolean;
    };
}

export interface OnlineUser {
    id: number;
    name: string;
    avatar: string | null;
    role: string | null;
    online: boolean;
    last_seen: string;
}

export interface LeaderboardEntry {
    id?: number;
    name: string;
    avatar?: string | null;
    // Only sent to superadmin, admin and staff; other roles see the ranking without figures.
    sales?: number;
    value?: number;
}

export interface LeaderboardMonth {
    month: string;
    // "YYYY-MM-DD HH:MM:SS"; null while the month is still open.
    cutoff_at: string | null;
    boards: { agents: LeaderboardEntry[]; brokerage: LeaderboardEntry[]; teams: LeaderboardEntry[]; projects: LeaderboardEntry[]; developers: LeaderboardEntry[] };
}

export interface SharedProps {
    auth: AuthUser | null;
    // Only present after the leaderboard panel requests it (optional prop), and null without permission.
    leaderboards?: LeaderboardMonth[] | null;
    online_users: OnlineUser[];
    flash: { success: string | null };
    [key: string]: unknown;
}
