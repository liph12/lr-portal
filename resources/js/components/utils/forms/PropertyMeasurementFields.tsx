import { ChangeEvent } from "react";
import { Grid } from "@mui/material";
import StyledTextField from "../StyledTextField";
import StyledAutocomplete from "../StyledAutocomplete";
import FieldLabel from "./FieldLabel";
import { MeasurementFields } from "../../../types/app-data-types";
import { SaleStepProps } from "../../../types";
import { condoTypes } from "../../../app-data";
import { showsFloorArea, showsLotArea, showsUnitType } from "../../../helpers/projectSaleFields";

const decimalProps = { props: { slotProps: { htmlInput: { inputMode: "decimal" as const } } } };

// The measurements a property type has (condo: unit type + floor area; house & lot / townhouse:
// floor + lot area; lot only: lot area). Grid items, so they sit inline with the rest of the form.
export default function PropertyMeasurementFields({ data, setData, errors }: SaleStepProps<MeasurementFields>) {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
        setData(e.target.name as "floor_area" | "lot_area", e.target.value);

    return (
        <>
            {showsUnitType(data.property_type) && (
                <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                    <FieldLabel text="Unit Type" required />
                    <StyledAutocomplete
                        options={condoTypes}
                        value={data.unit_type}
                        renderInput={(params) => <StyledTextField params={params} name="unit_type" error={errors.unit_type ?? null} />}
                        onChange={(_, v) => setData("unit_type", v)}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                    />
                </Grid>
            )}
            {showsFloorArea(data.property_type) && (
                <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                    <FieldLabel text="Floor Area (sqm)" required />
                    <StyledTextField
                        name="floor_area"
                        placeholder="0.00"
                        value={data.floor_area}
                        error={errors.floor_area ?? null}
                        handleChange={handleChange}
                        {...decimalProps}
                    />
                </Grid>
            )}
            {showsLotArea(data.property_type) && (
                <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                    <FieldLabel text="Lot Area (sqm)" required />
                    <StyledTextField
                        name="lot_area"
                        placeholder="0.00"
                        value={data.lot_area}
                        error={errors.lot_area ?? null}
                        handleChange={handleChange}
                        {...decimalProps}
                    />
                </Grid>
            )}
        </>
    );
}
