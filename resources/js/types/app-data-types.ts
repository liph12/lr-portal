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
        files: File[];
    };

export interface SalesSource {
    id: number;
    name: string;
}
