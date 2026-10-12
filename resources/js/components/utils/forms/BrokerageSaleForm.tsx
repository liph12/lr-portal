import { ChangeEvent } from "react";
import { Box, FormControlLabel, Grid, Radio, RadioGroup, Typography } from "@mui/material";
import StyledTextField from "../StyledTextField";
import StyledAutocomplete from "../StyledAutocomplete";
import FieldLabel from "./FieldLabel";
import AgentPicker from "./AgentPicker";
import PropertyMeasurementFields from "./PropertyMeasurementFields";
import { BrokerageFields } from "../../../types/app-data-types";
import { AutoCompleteValue, SaleStepProps } from "../../../types";
import { commissionStatus } from "../../../app-data";
import { makePaymentTerms } from "../../../helpers/projectSaleFields";
import { formatPesoExact } from "../../../helpers/formatNumber";
import { brokerageAmounts } from "../../../helpers/commissionSlip";

interface BrokerageSaleFormProps extends SaleStepProps<BrokerageFields> {
    brokerageAreas: AutoCompleteValue[];
    propertyTypes: AutoCompleteValue[];
    // Agents marked as brokers (Management › Designation).
    brokers: AutoCompleteValue[];
    // The fixed commission (5%) and the company-share choices (15% / 10%).
    commissionRate: number;
    companyShareRates: number[];
}

const PAYMENT_TERMS = makePaymentTerms();
const decimalProps = { props: { slotProps: { htmlInput: { inputMode: "decimal" as const } } } };
const today = () => new Date().toLocaleDateString("en-CA");

function Amount({ label, value, hint }: { label: string; value: number; hint: string }) {
    return (
        <Box sx={{ flex: "1 1 200px", p: 1.75, borderRadius: 2, backgroundColor: "var(--lr-surface)", border: "1px solid var(--lr-border)" }}>
            <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)", fontWeight: 500 }}>
                {label}
            </Typography>
            <Typography fontFamily="Google Sans Code" sx={{ fontSize: 20, color: "var(--lr-text-primary)", mt: 0.25 }}>
                {value > 0 ? formatPesoExact(value) : "—"}
            </Typography>
            <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                {hint}
            </Typography>
        </Box>
    );
}

// Brokerage sales are encoded from the Brokerage Commission Report Slip: the commission received gives the property's
// total and the company's share; the agents, the signing broker and the owner (printed on the slip only) complete it.
export default function BrokerageSaleForm({ data, setData, errors, brokerageAreas, propertyTypes, brokers, commissionRate, companyShareRates }: BrokerageSaleFormProps) {
    const handleChangeTextField = (e: ChangeEvent<HTMLInputElement>) => setData(e.target.name as keyof BrokerageFields, e.target.value as never);
    const { total, share } = brokerageAmounts(data.commission_received, commissionRate, data.company_share_rate);

    return (
        <Grid container spacing={2}>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <FieldLabel text="Brokerage Area" required />
                <StyledAutocomplete
                    options={brokerageAreas}
                    value={data.brokerage_area}
                    renderInput={(params) => (
                        <StyledTextField params={params} name="brokerage_area" placeholder="Search brokerage area" error={errors.brokerage_area_id ?? errors.brokerage_area ?? null} />
                    )}
                    onChange={(_, v) => setData("brokerage_area", v)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                />
            </Grid>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <FieldLabel text="Remittance Date" required />
                <StyledTextField
                    type="date"
                    name="remittance_date"
                    value={data.remittance_date}
                    error={errors.remittance_date ?? errors.reservation_date ?? null}
                    handleChange={handleChangeTextField}
                    props={{ slotProps: { htmlInput: { max: today() } } }}
                />
            </Grid>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <FieldLabel text="Unit No. / Block and Lot No." required />
                <StyledTextField name="unit_no" value={data.unit_no} error={errors.unit_no ?? null} handleChange={handleChangeTextField} />
            </Grid>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <FieldLabel text="Type of Property" required />
                <StyledAutocomplete
                    options={propertyTypes}
                    value={data.property_type}
                    renderInput={(params) => (
                        <StyledTextField params={params} name="property_type" placeholder="Select property type" error={errors.project_property_type_id ?? errors.property_type ?? null} />
                    )}
                    onChange={(_, v) => setData("property_type", v)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                />
            </Grid>

            <PropertyMeasurementFields data={data} setData={setData} errors={errors} />

            <Grid size={12}>
                {/* Outlined, not filled: a filled panel would hide the input's own fill, which is the same token. */}
                <Box sx={{ p: 2, borderRadius: 3, border: "1px solid var(--lr-border)" }}>
                    <Grid container spacing={2}>
                        <Grid size={{ md: 4, xs: 12 }}>
                            <FieldLabel text="Amount of Commission Received" required />
                            <StyledTextField
                                name="commission_received"
                                placeholder="0.00"
                                value={data.commission_received}
                                error={errors.commission_received ?? null}
                                handleChange={handleChangeTextField}
                                {...decimalProps}
                            />
                        </Grid>
                        <Grid size={{ md: 8, xs: 12 }}>
                            <FieldLabel text="Share of Company" required />
                            <RadioGroup
                                row
                                value={String(data.company_share_rate)}
                                onChange={(e) => setData("company_share_rate", Number(e.target.value))}
                                aria-label="Share of company"
                                sx={{ "& .MuiRadio-root.Mui-checked": { color: "var(--lr-primary)" } }}
                            >
                                {companyShareRates.map((rate) => (
                                    <FormControlLabel key={rate} value={String(rate)} control={<Radio size="small" />} label={`${rate}%`} />
                                ))}
                            </RadioGroup>
                        </Grid>
                        <Grid size={12}>
                            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                                <Amount label="Total amount of property" value={total} hint={`Commission received ÷ ${commissionRate}% (fixed)`} />
                                <Amount label={`${data.company_share_rate}% share of company`} value={share} hint={`${data.company_share_rate}% of the commission received`} />
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
            </Grid>

            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <FieldLabel text="Closing Agent" />
                <AgentPicker name="closing_agent" value={data.closing_agent} onChange={(agent) => setData("closing_agent", agent)} error={errors.closing_agent_id ?? null} exclude={data.partner_agent?.id} />
            </Grid>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <FieldLabel text="Partner Agent" />
                <AgentPicker name="partner_agent" value={data.partner_agent} onChange={(agent) => setData("partner_agent", agent)} error={errors.partner_agent_id ?? null} exclude={data.closing_agent?.id} />
            </Grid>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <FieldLabel text="Signing Broker" required />
                <StyledAutocomplete
                    options={brokers}
                    value={data.signing_broker}
                    renderInput={(params) => <StyledTextField params={params} name="signing_broker" placeholder="Search broker" error={errors.signing_broker_id ?? errors.signing_broker ?? null} />}
                    onChange={(_, v) => setData("signing_broker", v)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                />
            </Grid>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <FieldLabel text="Name of Property Owner" required />
                <StyledTextField
                    name="property_owner"
                    value={data.property_owner}
                    error={errors.property_owner ?? null}
                    handleChange={handleChangeTextField}
                    props={{ helperText: "Printed on the commission slip only — not saved." }}
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
                <StyledTextField name="remarks" value={data.remarks} error={errors.remarks ?? null} handleChange={handleChangeTextField} props={{ multiline: true, rows: 2 }} />
            </Grid>
        </Grid>
    );
}
