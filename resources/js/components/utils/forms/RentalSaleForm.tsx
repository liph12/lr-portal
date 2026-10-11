import { ChangeEvent } from "react";
import { Grid } from "@mui/material";
import StyledTextField from "../StyledTextField";
import StyledAutocomplete from "../StyledAutocomplete";
import FieldLabel from "./FieldLabel";
import AgentPicker from "./AgentPicker";
import PropertyMeasurementFields from "./PropertyMeasurementFields";
import { RentalFields } from "../../../types/app-data-types";
import { AutoCompleteValue, SaleStepProps } from "../../../types";
import { commissionStatus } from "../../../app-data";
import { makePaymentTerms } from "../../../helpers/projectSaleFields";

interface RentalSaleFormProps extends SaleStepProps<RentalFields> {
    propertyTypes: AutoCompleteValue[];
}

const LEASE_TERMS = makePaymentTerms();
const decimalProps = { props: { slotProps: { htmlInput: { inputMode: "decimal" as const } } } };

// Rentals aren't developer sales: no developer or project, just the unit, its terms and the agents on the deal.
export default function RentalSaleForm({ data, setData, errors, propertyTypes }: RentalSaleFormProps) {
    const handleChangeTextField = (e: ChangeEvent<HTMLInputElement>) =>
        setData(e.target.name as keyof RentalFields, e.target.value as never);

    return (
        <Grid container spacing={2}>
            <Grid size={{ lg: 6, md: 6, xs: 12 }}>
                <FieldLabel text="Unit No. / Property Address" required />
                <StyledTextField name="unit_no" value={data.unit_no} error={errors.unit_no ?? null} handleChange={handleChangeTextField} />
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
                <FieldLabel text="Monthly Rental Rate" required />
                <StyledTextField
                    name="rental_rate"
                    placeholder="0.00"
                    value={data.rental_rate}
                    error={errors.rental_rate ?? null}
                    handleChange={handleChangeTextField}
                    {...decimalProps}
                />
            </Grid>
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
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <FieldLabel text="Lease Term" required />
                <StyledAutocomplete
                    options={LEASE_TERMS}
                    value={data.payment_terms}
                    renderInput={(params) => <StyledTextField params={params} name="payment_terms" error={errors.payment_terms ?? null} />}
                    onChange={(_, v) => setData("payment_terms", v)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                />
            </Grid>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <FieldLabel text="Commission Status" required />
                <StyledAutocomplete
                    options={commissionStatus}
                    value={data.commission_status}
                    renderInput={(params) => <StyledTextField params={params} name="commission_status" error={errors.commission_status ?? null} />}
                    onChange={(_, v) => setData("commission_status", v)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                />
            </Grid>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <FieldLabel text="Closing Agent" />
                <AgentPicker
                    name="closing_agent"
                    value={data.closing_agent}
                    onChange={(agent) => setData("closing_agent", agent)}
                    error={errors.closing_agent_id ?? null}
                    exclude={data.partner_agent?.id}
                />
            </Grid>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <FieldLabel text="Partner Agent" />
                <AgentPicker
                    name="partner_agent"
                    value={data.partner_agent}
                    onChange={(agent) => setData("partner_agent", agent)}
                    error={errors.partner_agent_id ?? null}
                    exclude={data.closing_agent?.id}
                />
            </Grid>
            <Grid size={{ lg: 6, md: 6, xs: 12 }}>
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
