import { ChangeEvent } from "react";
import { Grid } from "@mui/material";
import StyledTextField from "../StyledTextField";
import StyledAutocomplete from "../StyledAutocomplete";
import FieldLabel from "./FieldLabel";
import PropertyMeasurementFields from "./PropertyMeasurementFields";
import { BrokerageFields } from "../../../types/app-data-types";
import { AutoCompleteValue, SaleStepProps } from "../../../types";
import { commissionStatus } from "../../../app-data";
import { makePaymentTerms } from "../../../helpers/projectSaleFields";

interface BrokerageSaleFormProps extends SaleStepProps<BrokerageFields> {
    brokerageAreas: AutoCompleteValue[];
    propertyTypes: AutoCompleteValue[];
}

const PAYMENT_TERMS = makePaymentTerms();
const decimalProps = { props: { slotProps: { htmlInput: { inputMode: "decimal" as const } } } };

// Brokerage sales are booked under a brokerage area (office) rather than a developer.
export default function BrokerageSaleForm({ data, setData, errors, brokerageAreas, propertyTypes }: BrokerageSaleFormProps) {
    const handleChangeTextField = (e: ChangeEvent<HTMLInputElement>) =>
        setData(e.target.name as keyof BrokerageFields, e.target.value as never);

    return (
        <Grid container spacing={2}>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <FieldLabel text="Brokerage Area" required />
                <StyledAutocomplete
                    options={brokerageAreas}
                    value={data.brokerage_area}
                    renderInput={(params) => (
                        <StyledTextField
                            params={params}
                            name="brokerage_area"
                            placeholder="Search brokerage area"
                            error={errors.brokerage_area_id ?? errors.brokerage_area ?? null}
                        />
                    )}
                    onChange={(_, v) => setData("brokerage_area", v)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                />
            </Grid>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <FieldLabel text="Unit No. / Block and Lot No." required />
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
                <FieldLabel text="Payment Terms" required />
                <StyledAutocomplete
                    options={PAYMENT_TERMS}
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
