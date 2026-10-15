import { ChangeEvent } from "react";
import { Grid, FormHelperText } from "@mui/material";
import StyledTextField from "../StyledTextField";
import StyledAutocomplete from "../StyledAutocomplete";
import { DeveloperProjectOption, ProjectFields } from "../../../types/app-data-types";
import { AutoCompleteValue, SaleStepProps } from "../../../types";
import { commissionStatus } from "../../../app-data";
import { makePaymentTerms } from "../../../helpers/projectSaleFields";
import PropertyMeasurementFields from "./PropertyMeasurementFields";
import DeveloperProjectFields from "./DeveloperProjectFields";

interface ProjectSaleFormProps extends SaleStepProps<ProjectFields> {
    developers: AutoCompleteValue[];
    projects: DeveloperProjectOption[];
    propertyTypes: AutoCompleteValue[];
}

const PAYMENT_TERMS = makePaymentTerms();

const labelSx = {
    color: "var(--lr-text-secondary)",
    fontWeight: 500,
    mb: 0.5,
    ml: 0.5,
};

function Label({ text, required }: { text: string; required?: boolean }) {
    return (
        <FormHelperText sx={labelSx}>
            {text}
            {required && <span style={{ color: "var(--lr-error)" }}> *</span>}
        </FormHelperText>
    );
}

export default function ProjectSaleForm({
    data,
    setData,
    errors,
    developers,
    projects,
    propertyTypes,
}: ProjectSaleFormProps) {
    const handleChangeTextField = (e: ChangeEvent<HTMLInputElement>) =>
        setData(e.target.name as keyof ProjectFields, e.target.value as never);

    const decimalProps = { props: { slotProps: { htmlInput: { inputMode: "decimal" as const } } } };

    return (
        <Grid container spacing={2}>
            <DeveloperProjectFields
                data={data}
                set={(key, value) => setData(key, value as never)}
                errors={errors}
                developers={developers}
                projects={projects}
                propertyTypes={propertyTypes}
                onPropertyType={(type) => setData("property_type", type)}
            />
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <Label text="Unit No. / Block and Lot No." required />
                <StyledTextField
                    name="unit_no"
                    value={data.unit_no}
                    error={errors.unit_no ?? null}
                    handleChange={handleChangeTextField}
                />
            </Grid>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <Label text="Property Type" required />
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
                <Label text="Total Contract Price" required />
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
                <Label text="Reservation Date" required />
                <StyledTextField
                    type="date"
                    name="reservation_date"
                    value={data.reservation_date}
                    error={errors.reservation_date ?? null}
                    handleChange={handleChangeTextField}
                />
            </Grid>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <Label text="Payment Terms" required />
                <StyledAutocomplete
                    options={PAYMENT_TERMS}
                    value={data.payment_terms}
                    renderInput={(params) => (
                        <StyledTextField
                            params={params}
                            name="payment_terms"
                            error={errors.payment_terms ?? null}
                        />
                    )}
                    onChange={(_, v) => setData("payment_terms", v)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                />
            </Grid>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <Label text="Commission Status" required />
                <StyledAutocomplete
                    options={commissionStatus}
                    value={data.commission_status}
                    renderInput={(params) => (
                        <StyledTextField
                            params={params}
                            name="commission_status"
                            error={errors.commission_status ?? null}
                        />
                    )}
                    onChange={(_, v) => setData("commission_status", v)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                />
            </Grid>
            <Grid size={{ lg: 6, md: 6, xs: 12 }}>
                <Label text="Remarks / Notes" />
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
