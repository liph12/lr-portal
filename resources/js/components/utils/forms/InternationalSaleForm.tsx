import { ChangeEvent } from "react";
import { Grid } from "@mui/material";
import StyledTextField from "../StyledTextField";
import StyledAutocomplete from "../StyledAutocomplete";
import FieldLabel from "./FieldLabel";
import PropertyMeasurementFields from "./PropertyMeasurementFields";
import { InternationalFields } from "../../../types/app-data-types";
import { AutoCompleteValue, SaleStepProps } from "../../../types";

interface InternationalSaleFormProps extends SaleStepProps<InternationalFields> {
    propertyTypes: AutoCompleteValue[];
}

const decimalProps = { props: { slotProps: { htmlInput: { inputMode: "decimal" as const } } } };

// A global partner's sale: the unit(s) sold, no developer, payment terms or commission.
export default function InternationalSaleForm({ data, setData, errors, propertyTypes }: InternationalSaleFormProps) {
    const handleChangeTextField = (e: ChangeEvent<HTMLInputElement>) =>
        setData(e.target.name as keyof InternationalFields, e.target.value as never);

    return (
        <Grid container spacing={2}>
            <Grid size={{ lg: 6, md: 6, xs: 12 }}>
                <FieldLabel text="Unit No. / Property" required />
                <StyledTextField name="unit_no" value={data.unit_no} error={errors.unit_no ?? null} handleChange={handleChangeTextField} />
            </Grid>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <FieldLabel text="Number of Units" required />
                <StyledTextField
                    name="unit_quantity"
                    value={data.unit_quantity}
                    error={errors.unit_quantity ?? null}
                    handleChange={handleChangeTextField}
                    props={{ slotProps: { htmlInput: { inputMode: "numeric" } } }}
                />
            </Grid>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <FieldLabel text="Property Type" required />
                <StyledAutocomplete
                    options={propertyTypes}
                    value={data.property_type}
                    renderInput={(params) => (
                        <StyledTextField
                            params={params}
                            name="property_type"
                            placeholder="Select property type"
                            error={errors.project_property_type_id ?? errors.property_type ?? null}
                        />
                    )}
                    onChange={(_, v) => setData("property_type", v)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                />
            </Grid>

            <PropertyMeasurementFields data={data} setData={setData} errors={errors} />

            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <FieldLabel text="Total Contract Price" required />
                <StyledTextField
                    name="total_contract_price"
                    placeholder="0.00"
                    value={data.total_contract_price}
                    error={errors.total_contract_price ?? null}
                    handleChange={handleChangeTextField}
                    {...decimalProps}
                />
            </Grid>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <FieldLabel text="Reservation Date" required />
                <StyledTextField
                    type="date"
                    name="reservation_date"
                    value={data.reservation_date}
                    error={errors.reservation_date ?? null}
                    handleChange={handleChangeTextField}
                />
            </Grid>
            <Grid size={{ lg: 6, md: 12, xs: 12 }}>
                <FieldLabel text="Remarks / Notes" />
                <StyledTextField
                    name="remarks"
                    value={data.remarks}
                    error={errors.remarks ?? null}
                    handleChange={handleChangeTextField}
                    props={{ multiline: true, rows: 2 }}
                />
            </Grid>
        </Grid>
    );
}
