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
    email: string;
    role: string | null;
}

export interface SharedProps {
    auth: AuthUser | null;
    flash: { success: string | null };
    [key: string]: unknown;
}
