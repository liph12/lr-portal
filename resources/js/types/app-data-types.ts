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

// Which of these apply depends on the property type (helpers/projectSaleFields.ts).
export interface MeasurementFields {
    property_type: AutoCompleteValue | null;
    unit_type: AutoCompleteValue | null;
    floor_area: string;
    lot_area: string;
}

export interface ProjectFields extends MeasurementFields {
    developer: AutoCompleteValue | null;
    project: AutoCompleteValue | null;
    // True when the project isn't in the catalogue and its name is typed instead.
    project_not_listed: boolean;
    project_name: string;
    unit_no: string;
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

export interface AgentOption {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
}

export interface RentalFields extends MeasurementFields {
    unit_no: string;
    rental_rate: string;
    total_contract_price: string;
    reservation_date: string;
    payment_terms: AutoCompleteValue | null;
    commission_status: AutoCompleteValue | null;
    closing_agent: AgentOption | null;
    partner_agent: AgentOption | null;
    remarks: string;
}

export type RentalSaleFormData = ClientFields &
    RentalFields & {
        deposit_slip: File | null;
        remittance_slip: File | null;
    };

export interface BrokerageFields extends MeasurementFields {
    brokerage_area: AutoCompleteValue | null;
    unit_no: string;
    total_contract_price: string;
    reservation_date: string;
    payment_terms: AutoCompleteValue | null;
    commission_status: AutoCompleteValue | null;
    remarks: string;
}

export type BrokerageSaleFormData = ClientFields &
    BrokerageFields & {
        deposit_slip: File | null;
        remittance_slip: File | null;
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

export interface RoleMembersPage {
    data: RoleUserItem[];
    page: number;
    last_page: number;
    total: number;
    search: string;
}

export type StatsPeriod = "12m" | "year" | "all";

export interface StatsSummary {
    period: StatsPeriod;
    range: { start: string | null; end: string };
    kpis: {
        sales: { value: number; previous: number | null };
        contract_value: { value: number; previous: number | null };
        average_deal: { value: number; previous: number | null };
        active_users: { value: number; total: number };
    };
    monthly: { month: string; sales: number; value: number }[];
    developers: { name: string; sales: number; value: number }[];
    propertyTypes: { name: string; sales: number; value: number }[];
    commission: { status: string; sales: number }[];
    team: {
        byRole: { name: string; users: number }[];
        byStatus: { status: UserStatus; users: number }[];
    };
}

export interface TeamRow {
    id: number;
    name: string;
    logo: string | null;
    status: string;
    agent_id: number;
    leader_name: string | null;
    leader_avatar: string | null;
    members_count: number;
    sub_teams_count: number;
}

export interface SubTeamRow {
    id: number;
    team_id: number;
    team_name: string;
    name: string;
    logo: string | null;
    status: string;
    agent_id: number;
    leader_name: string | null;
    leader_avatar: string | null;
    members_count: number;
}

export interface TeamOption {
    id: number;
    name: string;
    status: string;
    sub_teams: { id: number; name: string }[];
}

export interface AgentRow {
    id: number;
    user_id: number;
    name: string;
    email: string;
    avatar: string | null;
    status: string;
    role: string | null;
    role_label: string | null;
    team_id: number | null;
    team_name: string | null;
    sub_team_id: number | null;
    sub_team_name: string | null;
    joined_at: string | null;
}

export interface TransferRow {
    id: number;
    agent_id: number;
    name: string;
    avatar: string | null;
    team_id: number;
    team_name: string;
    joined_at: string | null;
    transferred_at: string | null;
    status: string;
    changed_on: string | null;
}
