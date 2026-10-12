import { ChangeEvent } from "react";
import { Box, FormControlLabel, Grid, MenuItem, Switch, Typography } from "@mui/material";
import StyledTextField from "../StyledTextField";
import StyledAutocomplete from "../StyledAutocomplete";
import FieldLabel from "./FieldLabel";
import AgentPicker from "./AgentPicker";
import { RentalFields } from "../../../types/app-data-types";
import { AutoCompleteValue, SaleStepProps } from "../../../types";
import { commissionStatus } from "../../../app-data";
import { formatPesoExact } from "../../../helpers/formatNumber";
import { rentalAmounts } from "../../../helpers/commissionSlip";

interface RentalSaleFormProps extends SaleStepProps<RentalFields> {
    propertyTypes: AutoCompleteValue[];
    // The fixed commission (8.3%), Rent.ph's share (20%) and how a duration is counted.
    commissionRate: number;
    shareRate: number;
    durationUnits: string[];
}

const decimalProps = { props: { slotProps: { htmlInput: { inputMode: "decimal" as const } } } };
const today = () => new Date().toLocaleDateString("en-CA");

function Amount({ label, value, hint }: { label: string; value: number; hint: string }) {
    return (
        <Box sx={{ flex: "1 1 200px", p: 1.75, borderRadius: 2, backgroundColor: "var(--lr-surface-container)" }}>
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

// Rental sales are encoded from the Rent.ph Rent Commission Report Slip: the amount received gives the contract's total
// and Rent.ph's share (shown, not stored); the closing agent brings their team and unit manager onto the slip.
export default function RentalSaleForm({ data, setData, errors, propertyTypes, commissionRate, shareRate, durationUnits }: RentalSaleFormProps) {
    const handleChangeTextField = (e: ChangeEvent<HTMLInputElement>) => setData(e.target.name as keyof RentalFields, e.target.value as never);
    const { total, share } = rentalAmounts(data.commission_received, commissionRate, shareRate);

    return (
        <Grid container spacing={2}>
            <Grid size={{ lg: 6, xs: 12 }}>
                <FieldLabel text="Address (unit no. / building / street)" required />
                <StyledTextField name="unit_no" value={data.unit_no} error={errors.unit_no ?? null} handleChange={handleChangeTextField} placeholder="e.g. Unit 1503, Tower 2, RLC Galleria Residences" />
            </Grid>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <FieldLabel text="Property Type" required />
                <StyledAutocomplete
                    options={propertyTypes}
                    value={data.property_type}
                    renderInput={(params) => <StyledTextField params={params} name="property_type" placeholder="Select property type" error={errors.project_property_type_id ?? errors.property_type ?? null} />}
                    onChange={(_, v) => setData("property_type", v)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                />
            </Grid>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <FieldLabel text="Size of Property (sqm)" required />
                <StyledTextField name="property_size" placeholder="0.00" value={data.property_size} error={errors.property_size ?? null} handleChange={handleChangeTextField} {...decimalProps} />
            </Grid>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <FieldLabel text="Rate of Rental" required />
                <StyledTextField name="rental_rate" placeholder="0.00" value={data.rental_rate} error={errors.rental_rate ?? null} handleChange={handleChangeTextField} {...decimalProps} />
            </Grid>
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <FieldLabel text="Duration" required />
                <Box sx={{ display: "flex", gap: 1 }}>
                    <Box sx={{ flex: "0 0 40%" }}>
                        <StyledTextField
                            name="duration_value"
                            placeholder="6"
                            value={data.duration_value}
                            error={errors.duration_value ?? null}
                            handleChange={handleChangeTextField}
                            props={{ slotProps: { htmlInput: { inputMode: "numeric" as const } } }}
                        />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <StyledTextField
                            name="duration_unit"
                            value={data.duration_unit}
                            error={errors.duration_unit ?? null}
                            handleChange={handleChangeTextField}
                            props={{
                                select: true,
                                children: durationUnits.map((u) => (
                                    <MenuItem key={u} value={u} sx={{ textTransform: "capitalize" }}>
                                        {u}
                                    </MenuItem>
                                )),
                            }}
                        />
                    </Box>
                </Box>
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
                <FieldLabel text="Commission Status" required />
                <StyledAutocomplete
                    options={commissionStatus}
                    value={data.commission_status}
                    renderInput={(params) => <StyledTextField params={params} name="commission_status" error={errors.commission_status ?? null} />}
                    onChange={(_, v) => setData("commission_status", v)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                />
            </Grid>

            <Grid size={12}>
                {/* Outlined, not filled: a filled panel would hide the input's own fill, which is the same token. */}
                <Box sx={{ p: 2, borderRadius: 3, border: "1px solid var(--lr-border)" }}>
                    <Grid container spacing={2}>
                        <Grid size={{ md: 4, xs: 12 }}>
                            <FieldLabel text="Amount Received" required />
                            <StyledTextField name="commission_received" placeholder="0.00" value={data.commission_received} error={errors.commission_received ?? null} handleChange={handleChangeTextField} {...decimalProps} />
                        </Grid>
                        <Grid size={{ md: 8, xs: 12 }}>
                            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", height: "100%", alignItems: "stretch" }}>
                                <Amount label="Total contract price" value={total} hint={`Amount received ÷ ${commissionRate}% (fixed)`} />
                                <Amount label={`${shareRate}% share of Rent.ph`} value={share} hint="Worked out, not saved" />
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
            </Grid>

            <Grid size={12}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Typography sx={{ fontWeight: 500, color: "var(--lr-text-primary)", flex: 1 }}>Closing agent</Typography>
                    <FormControlLabel
                        control={<Switch size="small" checked={data.unregistered} onChange={(_, on) => setData("unregistered", on)} />}
                        label={<Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>Not yet in LR (no account)</Typography>}
                    />
                </Box>
            </Grid>
            {data.unregistered ? (
                <>
                    <Grid size={{ lg: 4, md: 6, xs: 12 }}>
                        <FieldLabel text="Closing Agent's Full Name" required />
                        <StyledTextField name="unregistered_agent_name" value={data.unregistered_agent_name} error={errors.unregistered_agent_name ?? null} handleChange={handleChangeTextField} />
                    </Grid>
                    <Grid size={{ lg: 4, md: 6, xs: 12 }}>
                        <FieldLabel text="Their Email" required />
                        <StyledTextField type="email" name="unregistered_agent_email" value={data.unregistered_agent_email} error={errors.unregistered_agent_email ?? null} handleChange={handleChangeTextField} />
                    </Grid>
                    <Grid size={{ lg: 4, md: 6, xs: 12 }}>
                        <FieldLabel text="Their Mobile" />
                        <StyledTextField type="tel" name="unregistered_agent_mobile" value={data.unregistered_agent_mobile} error={errors.unregistered_agent_mobile ?? null} handleChange={handleChangeTextField} />
                    </Grid>
                    <Grid size={12}>
                        <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                            The sale is credited to them. When they make an LR account with this email (or mobile), it becomes theirs automatically.
                        </Typography>
                    </Grid>
                </>
            ) : (
                <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                    <FieldLabel text="Closing Agent" required />
                    <AgentPicker name="closing_agent" value={data.closing_agent} onChange={(agent) => setData("closing_agent", agent)} error={errors.closing_agent_id ?? null} exclude={data.partner_agent?.id} />
                </Grid>
            )}
            <Grid size={{ lg: 3, md: 6, xs: 12 }}>
                <FieldLabel text="Partner Agent" />
                <AgentPicker name="partner_agent" value={data.partner_agent} onChange={(agent) => setData("partner_agent", agent)} error={errors.partner_agent_id ?? null} exclude={data.closing_agent?.id} />
            </Grid>
            <Grid size={{ lg: 6, xs: 12 }}>
                <FieldLabel text="Remarks / Notes" />
                <StyledTextField name="remarks" value={data.remarks} error={errors.remarks ?? null} handleChange={handleChangeTextField} props={{ multiline: true, rows: 2 }} />
            </Grid>
            <Grid size={12}>
                <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                    The closing agent's team and unit manager are filled in on the slip from their records.
                </Typography>
            </Grid>
        </Grid>
    );
}
