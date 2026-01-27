import { SalesSource } from "./app-data-types";

export interface KeyValue {
    name: "string";
    value: "string";
}

export interface AutoCompleteValue {
    id: number | string;
    label: string;
}

export interface CreateSaleCompletedSteps {
    clientDetails: boolean;
    property: boolean;
    uploadPOT: boolean;
}

export interface CreateSaleHandler {
    salesSources: SalesSource[];
    step: number;
    handleChange?: (
        e: React.ChangeEvent<HTMLInputElement> | null,
        obj?: KeyValue | null
    ) => void;
    handleChangeAutocompleteContent?: (
        e: React.ChangeEvent<HTMLInputElement>
    ) => void;
    // handleChangeAutocomplete: <K extends keyof AccountDetails>(
    //     k: K,
    //     s: AutoCompleteValue[],
    //     v: AutoCompleteValue | null
    //   ) => void;
}
