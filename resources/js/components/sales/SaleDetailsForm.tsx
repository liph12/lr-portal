import { FormEvent, ReactNode, useMemo } from "react";
import { Box, Divider, Grid, Typography } from "@mui/material";
import { Link, useForm } from "@inertiajs/react";
import StyledButton from "../utils/StyledButton";
import StyledTextField from "../utils/StyledTextField";
import StyledAutocomplete from "../utils/StyledAutocomplete";
import FieldLabel from "../utils/forms/FieldLabel";
import UserAvatar from "../utils/user/UserAvatar";
import SaleFiles from "./SaleFiles";
import CommissionReceipt from "./CommissionReceipt";
import { isSlipSale } from "../../helpers/commissionSlip";
import { condoTypes, countries } from "../../app-data";
import { showsFloorArea, showsLotArea, showsUnitType } from "../../helpers/projectSaleFields";
import { formatDate } from "../../helpers/formatDate";
import { SaleCategory } from "../../types/app-data-types";

type Option = { id: number; label: string };
type Row = Record<string, string | number | null>;

export interface SaleDetail {
    id: number;
    category: SaleCategory;
    sale_status: string;
    unit_number: string | null;
    commission_status: string | null;
    term_of_payment: string | null;
    remarks: string | null;
    created_at: string | null;
    recorded_by: string | null;
    validated_at: string | null;
    validated_by: string | null;
    agent: { id: number; name: string | null; email: string | null; avatar: string | null; area: string } | null;
    client: Row;
    property: Row;
    names: { developer: string | null; brokerage_area: string | null; property_type: string | null; signing_broker?: string | null; received_by?: string | null; team?: string | null; unit_manager?: string | null };
    history: { user?: string; updated_at?: string; description?: string }[];
}

export interface EditOptions {
    developers: Option[];
    projects: { id: number; developer_id: number; name: string }[];
    brokerage_areas: Option[];
    property_types: Option[];
    commission_statuses: string[];
}

interface SaleDetailsFormProps {
    detail: SaleDetail;
    options: EditOptions | null;
    statuses: string[];
    statusLabels: Record<string, string>;
    baseUrl: string;
}

const str = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));
const sectionSx = { fontSize: 13, fontWeight: 600, color: "var(--lr-text-secondary)", mb: 1.5, mt: 0.5 };

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <Box>
            <Typography sx={sectionSx}>{title}</Typography>
            <Grid container spacing={1.5}>
                {children}
            </Grid>
        </Box>
    );
}

// Every detail of one sale, editable: status, client, property, payment; files and history read-only.
export default function SaleDetailsForm({ detail, options, statuses, statusLabels, baseUrl }: SaleDetailsFormProps) {
    const { client: c, property: p, category } = detail;
    const form = useForm({
        status: detail.sale_status,
        client_first_name: str(c.client_first_name),
        client_middle_name: str(c.client_middle_name),
        client_last_name: str(c.client_last_name),
        client_mobile: str(c.client_mobile),
        client_email: str(c.client_email),
        client_gender: str(c.client_gender),
        client_country: str(c.client_country),
        client_birthdate: str(c.client_birthdate).slice(0, 10),
        client_address: str(c.client_address),
        unit_number: str(detail.unit_number),
        commission_status: str(detail.commission_status),
        term_of_payment: str(detail.term_of_payment),
        remarks: str(detail.remarks),
        total_contract_price: str(p.total_contract_price),
        reservation_date: str(p.reservation_date).slice(0, 10),
        project_property_type_id: (p.project_property_type_id as number | null) ?? null,
        unit_type: str(p.unit_type),
        floor_area: str(p.floor_area),
        lot_area: str(p.lot_area),
        ...(category === "project" ? { developer_id: (p.developer_id as number | null) ?? null, project_name: str(p.project_name) } : {}),
        ...(category === "brokerage" ? { brokerage_area_id: (p.brokerage_area_id as number | null) ?? null } : {}),
        ...(category === "rental" ? { closing_agent: str(p.closing_agent), partner_agent: str(p.partner_agent), rental_rate: str(p.rental_rate), property_size: str(p.property_size) } : {}),
        ...(category !== "project" ? { remittance_date: str(p.remittance_date).slice(0, 10), commission_received: str(p.commission_received) } : {}),
    });
    const { data, setData, errors } = form;
    const d = data as Record<string, string | number | null>;
    const e = errors as Record<string, string | undefined>;

    const propertyType = data.project_property_type_id ? { id: data.project_property_type_id, label: "" } : null;
    const projectNames = useMemo(
        () => (options?.projects ?? []).filter((x) => x.developer_id === d.developer_id).map((x) => x.name),
        [options?.projects, d.developer_id],
    );
    const countryValue = countries.find((x) => x.id === data.client_country || x.label === data.client_country)?.label ?? data.client_country;

    // Same inputs as the record-sale forms: label above, StyledTextField / StyledAutocomplete below.
    const field = (name: string, label: string, size = 6, opts: { required?: boolean; type?: string; props?: object } = {}) => (
        <Grid size={{ xs: 12, sm: size }}>
            <FieldLabel text={label} required={opts.required} />
            <StyledTextField
                name={name}
                type={opts.type}
                value={str(d[name])}
                error={e[name] ?? null}
                handleChange={(ev) => setData(name as never, ev.target.value as never)}
                props={opts.props}
            />
        </Grid>
    );
    const date = (name: string, label: string, size = 6, required = false) => field(name, label, size, { type: "date", required });
    const money = (name: string, label: string, size = 6, required = false) =>
        field(name, label, size, { required, props: { slotProps: { htmlInput: { inputMode: "decimal" } } } });
    const picker = (name: string, label: string, list: Option[], required = false, size = 6) => (
        <Grid size={{ xs: 12, sm: size }}>
            <FieldLabel text={label} required={required} />
            <StyledAutocomplete
                options={list}
                value={list.find((o) => o.id === d[name]) ?? null}
                onChange={(_, v) => setData(name as never, (v?.id ?? null) as never)}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                renderInput={(params) => <StyledTextField params={params} name={name} placeholder={`Select ${label.toLowerCase()}`} error={e[name] ?? null} />}
            />
        </Grid>
    );
    // A fixed list of words (status, gender, commission status): the value is the word itself.
    const choice = (name: string, label: string, values: string[], labels: Record<string, string> = {}, size = 6, required = false) =>
        picker(name, label, values.map((v) => ({ id: v as unknown as number, label: labels[v] ?? v })), required, size);
    // Pick from a list or type something that isn't in it (project, country, unit type).
    const typeOrPick = (name: string, label: string, list: string[], value: string, onInput: (v: string) => void, size = 6, required = false) => (
        <Grid size={{ xs: 12, sm: size }}>
            <FieldLabel text={label} required={required} />
            <StyledAutocomplete
                {...({ freeSolo: true } as object)}
                options={list.map((x) => ({ id: x, label: x }))}
                value={null}
                inputValue={value}
                onInputChange={(_, v) => onInput(v)}
                renderInput={(params) => <StyledTextField params={params} name={name} error={e[name] ?? null} />}
            />
        </Grid>
    );

    const submit = (ev: FormEvent) => {
        ev.preventDefault();
        form.put(`${baseUrl}/${detail.id}`, { preserveScroll: true, preserveState: true });
    };

    return (
        <Box component="form" onSubmit={submit} noValidate sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {detail.agent && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                    <UserAvatar name={detail.agent.name ?? "?"} src={detail.agent.avatar} size={36} />
                    <Box sx={{ minWidth: 0 }}>
                        <Link href={`/agents/${detail.agent.id}`} style={{ textDecoration: "none" }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: "var(--lr-primary)" }}>
                                {detail.agent.name}
                            </Typography>
                        </Link>
                        <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                            {detail.agent.area}
                        </Typography>
                    </Box>
                </Box>
            )}

            {/* The evidence first: what the validator checks before setting the status. */}
            <SaleFiles detail={detail} />
            {isSlipSale(detail) && <CommissionReceipt detail={detail} />}

            <Section title="Validation">
                {choice("status", "Status", statuses, statusLabels, 6, true)}
                <Grid size={{ xs: 12, sm: 6 }} sx={{ display: "flex", alignItems: "flex-end", pb: 1 }}>
                    <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                        Added {detail.created_at ? formatDate(detail.created_at) : "—"}
                        {detail.recorded_by && ` by ${detail.recorded_by}`}
                        {detail.validated_at && ` · validated ${formatDate(detail.validated_at)}${detail.validated_by ? ` by ${detail.validated_by}` : ""}`}
                    </Typography>
                </Grid>
            </Section>

            <Section title="Client">
                {/* Legacy sales hold the client's full name here, with no last name. */}
                {field("client_first_name", data.client_last_name ? "First Name" : "First Name (or Full Name)", 4, { required: true })}
                {field("client_middle_name", "Middle Name", 4)}
                {field("client_last_name", "Last Name", 4)}
                {field("client_mobile", "Mobile", 6, { type: "tel" })}
                {field("client_email", "Email", 6, { type: "email" })}
                {choice("client_gender", "Gender", ["Male", "Female"], {}, 4)}
                {/* New sales store the country code, legacy ones its name: pick from the list or keep what's typed. */}
                {typeOrPick("client_country", "Country", countries.map((x) => x.label), countryValue, (v) => setData("client_country", countries.find((x) => x.label === v)?.id ?? v), 4)}
                {date("client_birthdate", `Birthdate${c.client_age ? ` (age ${c.client_age} at reservation)` : ""}`, 4)}
                {field("client_address", "Address", 12, { props: { multiline: true, rows: 3 } })}
            </Section>

            <Section title="Property">
                {category === "project" && (
                    <>
                        {picker("developer_id", "Developer", options?.developers ?? [], true)}
                        {/* Pick from the developer's catalogue, or type a project that isn't listed. */}
                        {typeOrPick("project_name", "Project", projectNames, str(d.project_name), (v) => setData("project_name" as never, v as never), 6, true)}
                    </>
                )}
                {category === "brokerage" && picker("brokerage_area_id", "Brokerage Area", options?.brokerage_areas ?? [], true)}
                {category === "rental" && (
                    <>
                        {field("closing_agent", "Closing Agent")}
                        {field("partner_agent", "Partner Agent")}
                    </>
                )}
                {picker("project_property_type_id", "Property Type", options?.property_types ?? [])}
                {field("unit_number", "Unit / Block and Lot No.")}
                {showsUnitType(propertyType) && typeOrPick("unit_type", "Unit Type", condoTypes.map((x) => x.label), data.unit_type, (v) => setData("unit_type", v), 4)}
                {showsFloorArea(propertyType) && money("floor_area", "Floor Area (sqm)", 4)}
                {showsLotArea(propertyType) && money("lot_area", "Lot Area (sqm)", 4)}
                {category === "rental" && (
                    <>
                        {money("rental_rate", "Monthly Rental Rate", 4)}
                        {field("property_size", "Property Size", 4)}
                    </>
                )}
            </Section>

            <Section title="Payment">
                {money("total_contract_price", "Total Contract Price", 6, true)}
                {date("reservation_date", "Reservation Date", 6, true)}
                {field("term_of_payment", "Payment Terms")}
                {choice("commission_status", "Commission Status", options?.commission_statuses ?? [])}
                {category !== "project" && (
                    <>
                        {date("remittance_date", "Remittance Date")}
                        {money("commission_received", "Commission Received")}
                    </>
                )}
                {field("remarks", "Remarks", 12, { props: { multiline: true, rows: 3, slotProps: { htmlInput: { maxLength: 255 } } } })}
            </Section>

            <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                <StyledButton disabled={!form.isDirty || form.processing} onClick={() => { form.reset(); form.clearErrors(); }} sx={{ color: "var(--lr-text-secondary)" }}>
                    Discard
                </StyledButton>
                <StyledButton type="submit" variant="contained" loading={form.processing} disabled={!form.isDirty} sx={{ px: 3, backgroundColor: "var(--lr-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } }}>
                    Save changes
                </StyledButton>
            </Box>

            {detail.history.length > 0 && (
                <>
                    <Divider />
                    <Box>
                        <Typography sx={sectionSx}>History</Typography>
                        <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                            {detail.history.map((h, i) => (
                                <Box component="li" key={i}>
                                    <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                                        {h.updated_at ? formatDate(h.updated_at) : ""}
                                        {h.user && ` · ${h.user}`}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: "var(--lr-text-body)", overflowWrap: "anywhere" }}>
                                        {h.description}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </>
            )}
        </Box>
    );
}
