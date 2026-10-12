import { ReactNode } from "react";
import { Box, Divider, Grid, Typography } from "@mui/material";
import { Link } from "@inertiajs/react";
import StatusChip from "../utils/StatusChip";
import UserAvatar from "../utils/user/UserAvatar";
import CountryFlag from "../utils/CountryFlag";
import SaleFiles from "./SaleFiles";
import CommissionReceipt from "./CommissionReceipt";
import { isSlipSale } from "../../helpers/commissionSlip";
import { SaleDetail } from "./SaleDetailsForm";
import { formatDate } from "../../helpers/formatDate";
import { formatPeso } from "../../helpers/formatNumber";
import { countries } from "../../app-data";

const STATUS_LABELS: Record<string, string> = { pending: "Pending", valid: "Validated", invalid: "Invalid", cancelled: "Cancelled" };
const sectionSx = { fontSize: 13, fontWeight: 600, color: "var(--lr-text-secondary)", mb: 1.5 };

function Fact({ label, children, size = 6 }: { label: string; children: ReactNode; size?: number }) {
    return (
        <Grid size={{ xs: 12, sm: size }}>
            <Typography variant="caption" component="div" sx={{ color: "var(--lr-text-secondary)" }}>
                {label}
            </Typography>
            <Typography variant="body2" component="div" sx={{ color: "var(--lr-text-primary)", overflowWrap: "anywhere" }}>
                {children === null || children === undefined || children === "" ? "—" : children}
            </Typography>
        </Grid>
    );
}

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

const str = (v: string | number | null | undefined) => (v === null || v === undefined ? null : String(v));
const date = (v: string | number | null | undefined) => (v ? formatDate(String(v)) : null);

// One sale, read-only (reports): the same details as Sales validation, with its files — nothing editable here.
export default function SaleDetailsView({ detail }: { detail: SaleDetail }) {
    const { client: c, property: p, category, names } = detail;
    const clientName = [c.client_first_name, c.client_middle_name, c.client_last_name].filter(Boolean).join(" ");
    const country = countries.find((x) => x.id === c.client_country || x.label === c.client_country);

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <StatusChip status={detail.sale_status}>{STATUS_LABELS[detail.sale_status] ?? detail.sale_status}</StatusChip>
                <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                    Added {date(detail.created_at) ?? "—"}
                    {detail.recorded_by && ` by ${detail.recorded_by}`}
                    {detail.validated_at && ` · validated ${formatDate(detail.validated_at)}${detail.validated_by ? ` by ${detail.validated_by}` : ""}`}
                </Typography>
            </Box>

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

            <SaleFiles detail={detail} />
            {isSlipSale(detail) && <CommissionReceipt detail={detail} />}

            <Divider />

            <Section title="Client">
                <Fact label="Name" size={12}>{clientName}</Fact>
                <Fact label="Mobile">{str(c.client_mobile)}</Fact>
                <Fact label="Email">{str(c.client_email)}</Fact>
                <Fact label="Gender">{str(c.client_gender)}</Fact>
                <Fact label="Country">{c.client_country ? <CountryFlag code={country?.id ?? null} country={country?.label ?? String(c.client_country)} /> : null}</Fact>
                <Fact label="Birthdate">{date(c.client_birthdate)}{c.client_age ? ` (age ${c.client_age} at reservation)` : ""}</Fact>
                <Fact label="Address" size={12}>{str(c.client_address)}</Fact>
            </Section>

            <Section title="Property">
                {category === "project" && (
                    <>
                        <Fact label="Developer">{names.developer}</Fact>
                        <Fact label="Project">{str(p.project_name)}</Fact>
                    </>
                )}
                {category === "brokerage" && <Fact label="Brokerage area">{names.brokerage_area}</Fact>}
                {category === "brokerage" && isSlipSale(detail) && (
                    <>
                        <Fact label="Closing agent">{str(p.closing_agent)}</Fact>
                        <Fact label="Partner agent">{str(p.partner_agent)}</Fact>
                        <Fact label="Signing broker">{names.signing_broker ?? null}</Fact>
                    </>
                )}
                {category === "rental" && (
                    <>
                        <Fact label="Closing agent">{str(p.closing_agent)}</Fact>
                        <Fact label="Partner agent">{str(p.partner_agent)}</Fact>
                    </>
                )}
                {category === "rental" && isSlipSale(detail) && (
                    <>
                        <Fact label="Team">{names.team ?? null}</Fact>
                        <Fact label="Unit manager">{names.unit_manager ?? null}</Fact>
                        <Fact label="Size of property">{p.property_size ? `${Number(p.property_size)} sqm` : null}</Fact>
                        <Fact label="Duration">{p.duration_value ? `${p.duration_value} ${p.duration_unit}` : null}</Fact>
                    </>
                )}
                <Fact label="Property type">{names.property_type}</Fact>
                <Fact label="Unit / block and lot">{detail.unit_number}</Fact>
                {p.unit_type && <Fact label="Unit type">{str(p.unit_type)}</Fact>}
                {p.floor_area && <Fact label="Floor area">{`${p.floor_area} sqm`}</Fact>}
                {p.lot_area && <Fact label="Lot area">{`${p.lot_area} sqm`}</Fact>}
                {category === "rental" && <Fact label="Monthly rental rate">{p.rental_rate ? formatPeso(Number(p.rental_rate)) : null}</Fact>}
            </Section>

            <Section title="Payment">
                <Fact label="Total contract price">{p.total_contract_price ? formatPeso(Number(p.total_contract_price)) : null}</Fact>
                <Fact label="Reservation date">{date(p.reservation_date)}</Fact>
                <Fact label="Payment terms">{detail.term_of_payment}</Fact>
                <Fact label="Commission status">{detail.commission_status}</Fact>
                {category !== "project" && (
                    <>
                        <Fact label="Remittance date">{date(p.remittance_date)}</Fact>
                        <Fact label="Commission received">{p.commission_received ? formatPeso(Number(p.commission_received)) : null}</Fact>
                    </>
                )}
                {isSlipSale(detail) && category === "brokerage" && (
                    <>
                        <Fact label="Commission percentage">{`${Number(p.commission_rate)}%`}</Fact>
                        <Fact label={`${Number(p.company_share_rate)}% share of company`}>{p.company_share ? formatPeso(Number(p.company_share)) : null}</Fact>
                    </>
                )}
                <Fact label="Remarks" size={12}>{detail.remarks}</Fact>
            </Section>

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
