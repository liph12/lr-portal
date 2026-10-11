import { FormEvent, ReactNode, useMemo } from "react";
import { Autocomplete, Box, Divider, Grid, MenuItem, TextField, Typography } from "@mui/material";
import { Link, useForm } from "@inertiajs/react";
import StyledButton from "../utils/StyledButton";
import UserAvatar from "../utils/user/UserAvatar";
import FileLink from "./FileLink";
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
    names: { developer: string | null; brokerage_area: string | null; property_type: string | null };
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

    const field = (name: string, label: string, size = 6, extra: object = {}) => (
        <Grid size={{ xs: 12, sm: size }}>
            <TextField fullWidth size="small" label={label} value={d[name] ?? ""} onChange={(ev) => setData(name as never, ev.target.value as never)} error={!!e[name]} helperText={e[name]} {...extra} />
        </Grid>
    );
    const date = (name: string, label: string, size = 6, required = false) => field(name, label, size, { type: "date", required, slotProps: { inputLabel: { shrink: true } } });
    const money = (name: string, label: string, size = 6, required = false) => field(name, label, size, { required, slotProps: { htmlInput: { inputMode: "decimal" } } });
    const picker = (name: string, label: string, list: Option[], required = false, size = 6) => (
        <Grid size={{ xs: 12, sm: size }}>
            <Autocomplete
                size="small"
                options={list}
                value={list.find((o) => o.id === d[name]) ?? null}
                onChange={(_, v) => setData(name as never, (v?.id ?? null) as never)}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                renderInput={(params) => <TextField {...params} label={label} required={required} error={!!e[name]} helperText={e[name]} />}
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

            <Section title="Validation">
                <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField select fullWidth size="small" label="Status" value={data.status} onChange={(ev) => setData("status", ev.target.value)} error={!!e.status} helperText={e.status}>
                        {statuses.map((s) => (
                            <MenuItem key={s} value={s}>
                                {statusLabels[s] ?? s}
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }} sx={{ display: "flex", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                        Added {detail.created_at ? formatDate(detail.created_at) : "—"}
                        {detail.recorded_by && ` by ${detail.recorded_by}`}
                        {detail.validated_at && ` · validated ${formatDate(detail.validated_at)}${detail.validated_by ? ` by ${detail.validated_by}` : ""}`}
                    </Typography>
                </Grid>
            </Section>

            <Section title="Client">
                {/* Legacy sales hold the client's full name here, with no last name. */}
                {field("client_first_name", data.client_last_name ? "First name" : "First name (or full name)", 4, { required: true })}
                {field("client_middle_name", "Middle name", 4)}
                {field("client_last_name", "Last name", 4)}
                {field("client_mobile", "Mobile", 6)}
                {field("client_email", "Email", 6, { type: "email" })}
                <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField select fullWidth size="small" label="Gender" value={data.client_gender} onChange={(ev) => setData("client_gender", ev.target.value)}>
                        <MenuItem value="">Not specified</MenuItem>
                        <MenuItem value="Male">Male</MenuItem>
                        <MenuItem value="Female">Female</MenuItem>
                    </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    {/* New sales store the country code, legacy ones its name: pick from the list or keep what's typed. */}
                    <Autocomplete
                        size="small"
                        freeSolo
                        options={countries.map((x) => x.label)}
                        inputValue={countryValue}
                        onInputChange={(_, v) => setData("client_country", countries.find((x) => x.label === v)?.id ?? v)}
                        renderInput={(params) => <TextField {...params} label="Country" error={!!e.client_country} helperText={e.client_country} />}
                    />
                </Grid>
                {date("client_birthdate", `Birthdate${c.client_age ? ` (age ${c.client_age} at reservation)` : ""}`, 4)}
                {field("client_address", "Address", 12, { multiline: true, minRows: 2 })}
            </Section>

            <Section title="Property">
                {category === "project" && (
                    <>
                        {picker("developer_id", "Developer", options?.developers ?? [], true)}
                        <Grid size={{ xs: 12, sm: 6 }}>
                            {/* Pick from the developer's catalogue, or type a project that isn't listed. */}
                            <Autocomplete
                                size="small"
                                freeSolo
                                options={projectNames}
                                inputValue={str(d.project_name)}
                                onInputChange={(_, v) => setData("project_name" as never, v as never)}
                                renderInput={(params) => <TextField {...params} label="Project" required error={!!e.project_name} helperText={e.project_name} />}
                            />
                        </Grid>
                    </>
                )}
                {category === "brokerage" && picker("brokerage_area_id", "Brokerage area", options?.brokerage_areas ?? [], true)}
                {category === "rental" && (
                    <>
                        {field("closing_agent", "Closing agent")}
                        {field("partner_agent", "Partner agent")}
                    </>
                )}
                {picker("project_property_type_id", "Property type", options?.property_types ?? [])}
                {field("unit_number", "Unit / block and lot")}
                {showsUnitType(propertyType) && (
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Autocomplete
                            size="small"
                            freeSolo
                            options={condoTypes.map((x) => x.label)}
                            inputValue={data.unit_type}
                            onInputChange={(_, v) => setData("unit_type", v)}
                            renderInput={(params) => <TextField {...params} label="Unit type" error={!!e.unit_type} helperText={e.unit_type} />}
                        />
                    </Grid>
                )}
                {showsFloorArea(propertyType) && money("floor_area", "Floor area (sqm)", 4)}
                {showsLotArea(propertyType) && money("lot_area", "Lot area (sqm)", 4)}
                {category === "rental" && (
                    <>
                        {money("rental_rate", "Monthly rental rate", 4)}
                        {field("property_size", "Property size", 4)}
                    </>
                )}
            </Section>

            <Section title="Payment">
                {money("total_contract_price", "Total contract price", 6, true)}
                {date("reservation_date", "Reservation date", 6, true)}
                {field("term_of_payment", "Payment terms")}
                <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField select fullWidth size="small" label="Commission status" value={data.commission_status} onChange={(ev) => setData("commission_status", ev.target.value)} error={!!e.commission_status} helperText={e.commission_status}>
                        <MenuItem value="">Not set</MenuItem>
                        {(options?.commission_statuses ?? []).map((s) => (
                            <MenuItem key={s} value={s}>
                                {s}
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>
                {category !== "project" && (
                    <>
                        {date("remittance_date", "Remittance date")}
                        {money("commission_received", "Commission received")}
                    </>
                )}
                {field("remarks", "Remarks", 12, { multiline: true, minRows: 2, slotProps: { htmlInput: { maxLength: 255 } } })}
            </Section>

            <Box>
                <Typography sx={sectionSx}>Files</Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {category === "project" ? (
                        <FileLink url={(p.proof_of_transaction as string | null) ?? null} label="Proof of transaction" />
                    ) : (
                        <>
                            <FileLink url={(p.remittance_slip as string | null) ?? null} label="Remittance slip" />
                            <FileLink url={(p.deposit_slip as string | null) ?? null} label="Deposit slip" />
                        </>
                    )}
                </Box>
            </Box>

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
