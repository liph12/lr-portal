import { ChangeEvent } from "react";
import { Grid, FormHelperText } from "@mui/material";
import StyledTextField from "../StyledTextField";
import StyledAutocomplete from "../StyledAutocomplete";
import { ProjectFields } from "../../../types/app-data-types";
import { AutoCompleteValue, SaleStepProps } from "../../../types";
import { propertyTypes, condoTypes, commissionStatus } from "../../../app-data";
import {
    makePaymentTerms,
    showsFloorArea,
    showsLotArea,
    showsUnitType,
} from "../../../helpers/projectSaleFields";

interface ProjectSaleFormProps extends SaleStepProps<ProjectFields> {
    developers: AutoCompleteValue[];
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
}: ProjectSaleFormProps) {
    const handleChangeTextField = (e: ChangeEvent<HTMLInputElement>) =>
        setData(e.target.name as keyof ProjectFields, e.target.value as never);

    const decimalProps = { props: { slotProps: { htmlInput: { inputMode: "decimal" as const } } } };

    return (
        <Grid container spacing={2}>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <Label text="Developer" required />
                <StyledAutocomplete
                    options={developers}
                    value={data.developer}
                    renderInput={(params) => (
                        <StyledTextField
                            params={params}
                            placeholder="Search developer"
                            name="developer"
                            error={errors.developer_id ?? errors.developer ?? null}
                        />
                    )}
                    onChange={(_, v) => setData("developer", v)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                />
            </Grid>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <Label text="Project Name" required />
                <StyledTextField
                    name="project_name"
                    placeholder="e.g. Mivela Garden Residences"
                    value={data.project_name}
                    error={errors.project_name ?? null}
                    handleChange={handleChangeTextField}
                />
            </Grid>
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
                            error={errors.property_type ?? null}
                        />
                    )}
                    onChange={(_, v) => setData("property_type", v)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                />
            </Grid>

            {showsUnitType(data.property_type) && (
                <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                    <Label text="Unit Type" />
                    <StyledAutocomplete
                        options={condoTypes}
                        value={data.unit_type}
                        renderInput={(params) => (
                            <StyledTextField
                                params={params}
                                name="unit_type"
                                error={errors.unit_type ?? null}
                            />
                        )}
                        onChange={(_, v) => setData("unit_type", v)}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                    />
                </Grid>
            )}
            {showsFloorArea(data.property_type) && (
                <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                    <Label text="Floor Area (sqm)" />
                    <StyledTextField
                        name="floor_area"
                        placeholder="0.00"
                        value={data.floor_area}
                        error={errors.floor_area ?? null}
                        handleChange={handleChangeTextField}
                        {...decimalProps}
                    />
                </Grid>
            )}
            {showsLotArea(data.property_type) && (
                <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                    <Label text="Lot Area (sqm)" />
                    <StyledTextField
                        name="lot_area"
                        placeholder="0.00"
                        value={data.lot_area}
                        error={errors.lot_area ?? null}
                        handleChange={handleChangeTextField}
                        {...decimalProps}
                    />
                </Grid>
            )}

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
