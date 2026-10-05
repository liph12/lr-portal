import { AutoCompleteValue } from "../types";

// Property type ids from app-data `propertyTypes` whose units have extra measurements.
const CONDO = 1;
const HOUSE_AND_LOT = 10;
const TOWNHOUSE = 11;
const LOT_ONLY = 12;

export function showsUnitType(propertyType: AutoCompleteValue | null): boolean {
    return propertyType?.id === CONDO;
}

export function showsFloorArea(propertyType: AutoCompleteValue | null): boolean {
    return [CONDO, HOUSE_AND_LOT, TOWNHOUSE].indexOf(Number(propertyType?.id)) !== -1;
}

export function showsLotArea(propertyType: AutoCompleteValue | null): boolean {
    return [HOUSE_AND_LOT, TOWNHOUSE, LOT_ONLY].indexOf(Number(propertyType?.id)) !== -1;
}

export function makePaymentTerms(months = 48): AutoCompleteValue[] {
    return [
        { id: 0, label: "Cash" },
        ...Array.from({ length: months }, (_, i) => ({
            id: i + 1,
            label: `${i + 1} Month${i > 0 ? "s" : ""}`,
        })),
    ];
}
