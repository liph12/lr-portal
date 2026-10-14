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
    client_age?: string;
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

// Encoded from the Rent.ph Rent Commission Report Slip: the contract's total is worked out from the amount received;
// Rent.ph's share and the closing agent's team / unit manager are shown, never stored.
export interface RentalFields {
    unit_no: string;
    property_type: AutoCompleteValue | null;
    property_size: string;
    rental_rate: string;
    duration_value: string;
    duration_unit: string;
    remittance_date: string;
    commission_received: string;
    commission_status: AutoCompleteValue | null;
    closing_agent: AgentOption | null;
    // A closing agent with no LR account yet: kept by name, linked by email / mobile once they sign up.
    unregistered: boolean;
    unregistered_agent_name: string;
    unregistered_agent_email: string;
    unregistered_agent_mobile: string;
    partner_agent: AgentOption | null;
    remarks: string;
}

export type RentalSaleFormData = ClientFields &
    RentalFields & {
        contract: File | null;
        proof_of_transaction: File | null;
        deposit_slip: File | null;
    };

// Encoded from the Brokerage Commission Report Slip: the property's total and the company's share are worked out from
// the commission received; the owner's name only goes on the generated slip.
export interface BrokerageFields extends MeasurementFields {
    brokerage_area: AutoCompleteValue | null;
    unit_no: string;
    remittance_date: string;
    commission_received: string;
    company_share_rate: number;
    closing_agent: AgentOption | null;
    partner_agent: AgentOption | null;
    signing_broker: AutoCompleteValue | null;
    property_owner: string;
    payment_terms: AutoCompleteValue | null;
    commission_status: AutoCompleteValue | null;
    remarks: string;
}

export type BrokerageSaleFormData = ClientFields &
    BrokerageFields & {
        contract: File | null;
        proof_of_transaction: File | null;
        deposit_slip: File | null;
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
    instagram: string;
    twitter: string;
    linkedin: string;
    whatsapp: string;
}

// Profile › Business profile: what the public business profile shows beyond the agent's basic details.
export interface BusinessProfileFields {
    about: string;
    mobile: string;
    facebook: string;
    instagram: string;
    twitter: string;
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
    // Heading it's grouped under on the Roles page (Permission::SECTIONS).
    section: string;
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

// The three local sale categories (sales validation, reports).
export type SaleCategory = "project" | "brokerage" | "rental";

// Sales by the client's age band (App\Support\ClientStats::ages).
export interface ClientAges {
    // Fixed bands (18–24 … 65+), youngest first.
    rows: { name: string; sales: number; value: number }[];
    counted: number;
    // Sales with no age recorded, or one that isn't a real age (under 18, 100+): left out of the bands.
    excluded: number;
}

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
    // Clients of the period's project sales.
    clients: {
        countries: { name: string; code: string | null; sales: number; value: number }[];
        genders: { name: string; sales: number; value: number }[];
        ages: ClientAges;
    };
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

// Shown as badges beside the role (Management › Agents › Designation sets them).
export interface Designations {
    is_broker: boolean;
    broker_since: string | null;
    unit_manager_by: "rate" | "dashboard" | null;
    unit_manager_since: string | null;
}

export interface AgentRow extends Designations {
    id: number;
    user_id: number;
    name: string;
    email: string;
    avatar: string | null;
    status: string;
    agent_type: "local" | "global_partner";
    // Shown status (dormant agents read "inactive"); account_status is the real users.status the menu changes.
    account_status: string;
    // Dormant: 6 months without a sale since activation (never blocks sign-in).
    activity: "active" | "dormant";
    activated_at: string | null;
    country: string | null;
    country_code: string | null;
    // config/areas.php key; null when unassigned.
    area: string | null;
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

export interface SalesEncodingState {
    enabled: boolean;
    // Shown to people trying to record while recording is off.
    message: string | null;
    changed_at: string | null;
}

// month (YYYY-MM) => cutoff time (ISO 8601)
export type SalesCutoffTimes = Record<string, string>;

export const AGENT_TYPE_LABELS: Record<string, string> = { local: "Local agent", global_partner: "Global partner" };

export interface InternationalFields extends MeasurementFields {
    unit_no: string;
    unit_quantity: string;
    total_contract_price: string;
    reservation_date: string;
    remarks: string;
}

export type InternationalSaleFormData = ClientFields &
    InternationalFields & {
        proof_of_transaction: File | null;
    };

// Onboarding › NAO (NaoService::state). status keeps the legacy values: yes = sent a proof (approved once reviewed),
// disapproved; the webinar leaves it null. stage is what the page shows.
export interface NaoState {
    stage: "choose" | "awaiting" | "disapproved" | "webinar" | "done";
    approved: boolean;
    status: "yes" | "no" | "disapproved" | null;
    progress: number;
    seconds: number;
    attended_on: string | null;
    proof: string | null;
    submitted_at: string | null;
    remarks: string | null;
    video: { id: string; seconds: number };
    sponsor: { name: string; avatar: string | null; mobile: string | null; email: string | null } | null;
}
