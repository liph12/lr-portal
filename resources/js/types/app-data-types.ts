import { AutoCompleteValue } from ".";

export interface ClientFields {
    client_firstname: string;
    client_middlename: string;
    client_lastname: string;
    client_email: string;
    client_mobile: string;
    client_birthdate: string;
    client_gender: AutoCompleteValue | null;
    client_country: AutoCompleteValue | null;
    client_address: string;
}

export interface ProjectFields {
    developer: AutoCompleteValue | null;
    project: AutoCompleteValue | null;
    // True when the project isn't in the catalogue and its name is typed instead.
    project_not_listed: boolean;
    project_name: string;
    unit_no: string;
    property_type: AutoCompleteValue | null;
    unit_type: AutoCompleteValue | null;
    floor_area: string;
    lot_area: string;
    total_contract_price: string;
    reservation_date: string;
    payment_terms: AutoCompleteValue | null;
    remarks: string;
    commission_status: AutoCompleteValue | null;
}

export type ProjectSaleFormData = ClientFields &
    ProjectFields & {
        proof_of_transaction: File | null;
    };

export interface DeveloperProjectOption {
    id: number;
    developer_id: number;
    name: string;
    project_property_type_id: number | null;
}

export interface PropertyTypeOption {
    id: number;
    name: string;
}

export interface SalesSource {
    id: number;
    name: string;
}

export interface ProfileFields {
    first_name: string;
    middle_name: string;
    last_name: string;
    email: string;
    mobile: string;
    phone: string;
    gender: "Male" | "Female" | null;
    marital_status: string | null;
    address: string;
    city: string;
    state: string;
    about: string;
    facebook: string;
    linkedin: string;
    whatsapp: string;
}

export interface RoleItem {
    id: number;
    name: string;
    label: string;
    is_system: boolean;
    is_superadmin: boolean;
    users_count: number;
    permission_ids: number[];
}

export interface PermissionItem {
    id: number;
    name: string;
    label: string;
    roles_count: number;
}

export interface RoleUserItem {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    role_id: number | null;
    status: UserStatus;
}

export type UserStatus = "active" | "inactive" | "resigned" | "terminated";
