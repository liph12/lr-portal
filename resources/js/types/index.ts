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
    email: string;
    role: string | null;
    avatar: string | null;
    can: {
        access_superadmin: boolean;
        search_users: boolean;
        manage_users: boolean;
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

export interface SharedProps {
    auth: AuthUser | null;
    online_users: OnlineUser[];
    flash: { success: string | null };
    [key: string]: unknown;
}
