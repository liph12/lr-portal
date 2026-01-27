import { AutoCompleteValue } from ".";

export interface ClientForm {
    client_firstname: string;
    client_middlename: string;
    client_lastname: string;
    client_email: string;
    client_mobile: string;
    client_birthdate: string;
    client_gender: AutoCompleteValue;
    client_country: AutoCompleteValue;
    client_address: string;
}

export interface ProjectForm {
    developer?: AutoCompleteValue;
    unit_no: string;
    unit_type?: AutoCompleteValue;
    floor_area?: string;
    lot_area?: string;
    property_type: AutoCompleteValue;
    total_contract_price: string;
    reservation_date: string;
    payment_terms: AutoCompleteValue;
    remarks: string;
    commission_status: AutoCompleteValue;
}

export interface SalesSource {
    id: number;
    name: string;
}
