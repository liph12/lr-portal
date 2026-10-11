import { AutoCompleteValue } from "../types";
import { MeasurementFields } from "../types/app-data-types";

// project_property_types ids (ProjectPropertyTypeSeeder) whose units have extra measurements;
// mirrored by App\Models\Entities\ProjectPropertyType, which enforces them on the server.
const CONDO = 1;
const HOUSE_AND_LOT = 10;
const TOWNHOUSE = 11;
const LOT_ONLY = 14;

export function showsUnitType(propertyType: AutoCompleteValue | null): boolean {
    return propertyType?.id === CONDO;
}

export function showsFloorArea(propertyType: AutoCompleteValue | null): boolean {
    return [CONDO, HOUSE_AND_LOT, TOWNHOUSE].indexOf(Number(propertyType?.id)) !== -1;
}

export function showsLotArea(propertyType: AutoCompleteValue | null): boolean {
    return [HOUSE_AND_LOT, TOWNHOUSE, LOT_ONLY].indexOf(Number(propertyType?.id)) !== -1;
}

export const MEASUREMENT_KEYS: (keyof MeasurementFields)[] = ["unit_type", "floor_area", "lot_area"];

// Messages for the measurements this property type needs but that are still empty.
export function missingMeasurements(data: MeasurementFields): [keyof MeasurementFields, string][] {
    const missing: [keyof MeasurementFields, string][] = [];
    const empty = (v: string) => !(Number(v.replace(/,/g, "").trim()) > 0);

    if (showsUnitType(data.property_type) && !data.unit_type) missing.push(["unit_type", "Select the unit type."]);
    if (showsFloorArea(data.property_type) && empty(data.floor_area)) missing.push(["floor_area", "Enter the floor area."]);
    if (showsLotArea(data.property_type) && empty(data.lot_area)) missing.push(["lot_area", "Enter the lot area."]);

    return missing;
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
