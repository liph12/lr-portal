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

export interface AuthUser {
    id: number;
    name: string;
    first_name: string;
    agent_id: number | null;
    email: string;
    role: string | null;
    avatar: string | null;
    portal: "superadmin" | "admin" | "staff" | null;
    home: string;
    permissions: string[];
    // Label of the role a superadmin is previewing, else null; view_as_roles is filled only for real superadmins.
    viewing_as: string | null;
    view_as_roles: { name: string; label: string }[];
    can: {
        access_superadmin: boolean;
        search_users: boolean;
        manage_users: boolean;
        view_leaderboards: boolean;
        view_as: boolean;
        manage_teams: boolean;
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
    sales: number;
    value: number;
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
