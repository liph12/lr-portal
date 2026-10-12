import { ReactNode } from "react";
import { Box, Container, Drawer, IconButton, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { CloseRounded } from "@mui/icons-material";
import { router } from "@inertiajs/react";
import { GridColDef } from "@mui/x-data-grid";
import AppLayout from "../../../components/layouts/AppLayout";
import SectionTitle from "../../../components/utils/SectionTitle";
import DataTable from "../../../components/utils/tables/DataTable";
import TableToolbar from "../../../components/utils/tables/TableToolbar";
import PersonCell from "../../../components/utils/tables/PersonCell";
import CommissionReceiptPanel from "../../../components/sales/CommissionReceiptPanel";
import DateRangeField from "../../../components/utils/DateRangeField";
import FilterSelect from "../../../components/utils/tables/FilterSelect";
import { reportPresets } from "../../../helpers/dateRanges";
import SaleFiles from "../../../components/sales/SaleFiles";
import { SaleDetail } from "../../../components/sales/SaleDetailsForm";
import useServerTable, { ServerPage, TableFilters } from "../../../hooks/useServerTable";
import { formatDate } from "../../../helpers/formatDate";
import { formatPeso, formatPesoExact } from "../../../helpers/formatNumber";
import { rentalAmounts } from "../../../helpers/commissionSlip";

type Category = "brokerage" | "rental";

interface ReceivingRow {
    unregistered_agent: boolean;
    disapproved_at: string | null;
    disapproved_by: string | null;
    disapproval_reason: string | null;
    id: number;
    remittance_date: string | null;
    client: string;
    agent: string | null;
    closing_agent: string | null;
    // Brokerage area, or the rental's unit address.
    place: string | null;
    area: string | null;
    commission_received: number;
    share: number;
    share_rate: number;
    received_at: string | null;
    received_by: string | null;
    slip: string | null;
}

interface CommissionReceivingProps {
    // Brokerage receiving or Rental receiving (each its own page and route).
    category: Category;
    sales: ServerPage<ReceivingRow>;
    filters: TableFilters & { status: "awaiting" | "received" | "disapproved"; from: string; to: string; area: string | null };
    counts: { awaiting: number; received: number; disapproved: number };
    areas: { value: string; label: string }[];
    // Rent.ph's share isn't stored: worked out from the amount received at these rates.
    rentRates: { commission: number; share: number };
    saleDetail: SaleDetail | null;
}

const CATEGORY = {
    brokerage: { label: "Brokerage", place: "Brokerage area", share: "Company share", received: "Commission", subtitle: "Confirm each brokerage commission was received and sign for it — the sale becomes valid and its slip is signed." },
    rental: { label: "Rental", place: "Address", share: "Rent.ph share", received: "Amount received", subtitle: "Confirm each rental payment was received and sign for it — the sale becomes valid and its rent commission slip is signed." },
};

const toggleSx = {
    "& .MuiToggleButton-root": { textTransform: "none", px: 2, py: 0.75, fontSize: 14, gap: 1, borderColor: "var(--lr-border)", color: "var(--lr-text-secondary)" },
    "& .Mui-selected": { color: "var(--lr-primary) !important", backgroundColor: "var(--lr-primary-soft) !important" },
};

const Count = ({ n }: { n: number }) => (
    <Box component="span" sx={{ px: 0.875, borderRadius: 99, fontSize: 12, fontWeight: 600, backgroundColor: "var(--lr-surface-container)" }}>
        {n}
    </Box>
);

const str = (v: unknown) => (v === null || v === undefined || v === "" ? null : String(v));

function Fact({ label, children }: { label: string; children: ReactNode }) {
    return (
        <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)", fontWeight: 500 }}>
                {label}
            </Typography>
            <Typography variant="body2" sx={{ color: "var(--lr-text-primary)", wordBreak: "break-word" }}>
                {children ?? "—"}
            </Typography>
        </Box>
    );
}

// The opened sale: the generated commission slip, what it says, the other files, and the signed receipt.
function SalePanel({ detail, base, rentRates, onClose }: { detail: SaleDetail; base: string; rentRates: CommissionReceivingProps["rentRates"]; onClose: () => void }) {
    const p = detail.property;
    const rental = detail.category === "rental";
    const rentShare = rentalAmounts(Number(p.commission_received ?? 0), rentRates.commission, rentRates.share).share;
    const duration = p.duration_value ? `${p.duration_value} ${Number(p.duration_value) === 1 ? String(p.duration_unit).replace(/s$/, "") : p.duration_unit}` : null;

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 500, color: "var(--lr-text-primary)" }}>
                        {CATEGORY[rental ? "rental" : "brokerage"].label} sale No. {detail.id}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                        {rental ? detail.unit_number : detail.names.brokerage_area} · remitted {p.remittance_date ? formatDate(String(p.remittance_date)) : "—"}
                    </Typography>
                </Box>
                <IconButton aria-label="Close" onClick={onClose}>
                    <CloseRounded />
                </IconButton>
            </Box>

            {p.remittance_slip && (
                <Box component="a" href={String(p.remittance_slip)} target="_blank" rel="noopener" sx={{ display: "block" }} aria-label="Open the commission slip full size">
                    <Box component="img" src={String(p.remittance_slip)} alt="Commission slip" sx={{ width: "100%", display: "block", borderRadius: 3, border: "1px solid var(--lr-border)" }} />
                </Box>
            )}

            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.5, p: 2, borderRadius: 3, backgroundColor: "var(--lr-surface-container)" }}>
                {rental ? (
                    <>
                        <Fact label="Amount received">{p.commission_received ? formatPesoExact(Number(p.commission_received)) : null}</Fact>
                        <Fact label={`${rentRates.share}% share of Rent.ph`}>{rentShare ? formatPesoExact(rentShare) : null}</Fact>
                        <Fact label="Total contract price">{p.total_contract_price ? formatPesoExact(Number(p.total_contract_price)) : null}</Fact>
                        <Fact label="Rate of rental">{p.rental_rate ? formatPeso(Number(p.rental_rate)) : null}</Fact>
                        <Fact label="Duration">{duration}</Fact>
                        <Fact label="Size of property">{p.property_size ? `${Number(p.property_size)} sqm` : null}</Fact>
                        <Fact label="Closing agent">{str(p.closing_agent)}</Fact>
                        <Fact label="Partner agent">{str(p.partner_agent)}</Fact>
                        <Fact label="Team">{detail.names.team ?? null}</Fact>
                        <Fact label="Unit manager">{detail.names.unit_manager ?? null}</Fact>
                    </>
                ) : (
                    <>
                        <Fact label="Commission received">{p.commission_received ? formatPesoExact(Number(p.commission_received)) : null}</Fact>
                        <Fact label={`${Number(p.company_share_rate)}% share of company`}>{p.company_share ? formatPesoExact(Number(p.company_share)) : null}</Fact>
                        <Fact label="Total amount of property">{p.total_contract_price ? formatPeso(Number(p.total_contract_price)) : null}</Fact>
                        <Fact label="Signing broker">{detail.names.signing_broker}</Fact>
                        <Fact label="Closing agent">{str(p.closing_agent)}</Fact>
                        <Fact label="Partner agent">{str(p.partner_agent)}</Fact>
                    </>
                )}
                <Fact label="Encoded by">{detail.recorded_by}</Fact>
            </Box>

            <SaleFiles detail={detail} />

            <CommissionReceiptPanel detail={detail} base={base} />
        </Box>
    );
}

// Brokerage receiving / Rental receiving: sales encoded from their commission slips wait here until someone confirms the
// commission was received and signs for it — which validates the sale and signs the slip.
function CommissionReceiving({ category, sales, filters, counts, areas, rentRates, saleDetail }: CommissionReceivingProps) {
    const table = useServerTable("sales", sales, filters, ["counts"]);
    const received = filters.status === "received";
    const disapproved = filters.status === "disapproved";
    const labels = CATEGORY[category];
    const base = `/${category}-receiving`;

    // A sale opens by ?sale=, a partial reload of one prop (so receiving's redirect reopens it, now signed).
    const showSale = (id: number | null) => {
        const query = Object.fromEntries(new URLSearchParams(window.location.search));
        delete query.sale;
        if (id) query.sale = String(id);
        router.get(base, query, { only: ["saleDetail"], preserveState: true, preserveScroll: true, replace: true });
    };

    const columns: GridColDef<ReceivingRow>[] = [
        { field: "id", headerName: "No.", width: 90, renderCell: ({ row }) => String(row.id).padStart(2, "0") },
        { field: "remittance_date", headerName: "Remitted", width: 120, valueGetter: (_, row) => (row.remittance_date ? formatDate(row.remittance_date) : "—") },
        { field: "client", headerName: "Client", flex: 1, minWidth: 170, sortable: false },
        {
            field: "agent",
            headerName: "Agent",
            flex: 1,
            minWidth: 190,
            sortable: false,
            // A rental closing agent with no LR account yet is the one credited, by name, until an account links them.
            renderCell: ({ row }) =>
                row.unregistered_agent ? (
                    <PersonCell name={row.closing_agent} secondary="Not yet in LR · linked when they sign up" hideAvatar />
                ) : (
                    <PersonCell name={row.agent} secondary={row.closing_agent ? `Closing: ${row.closing_agent}` : undefined} hideAvatar />
                ),
        },
        { field: "place", headerName: labels.place, flex: 1, minWidth: 170, sortable: false },
        { field: "commission_received", headerName: labels.received, width: 150, valueGetter: (_, row) => formatPeso(row.commission_received) },
        { field: "share", headerName: labels.share, width: 160, sortable: false, valueGetter: (_, row) => `${formatPeso(row.share)} (${row.share_rate}%)` },
        ...(received
            ? [{ field: "received_at", headerName: "Received", width: 200, renderCell: ({ row }: { row: ReceivingRow }) => <PersonCell name={row.received_by} secondary={row.received_at ? formatDate(row.received_at) : undefined} hideAvatar /> }]
            : []),
        ...(disapproved
            ? [
                  {
                      field: "disapproved_at",
                      headerName: "Disapproved",
                      flex: 1.2,
                      minWidth: 240,
                      renderCell: ({ row }: { row: ReceivingRow }) => (
                          <PersonCell name={row.disapproval_reason ?? "Marked invalid in Sales validation"} secondary={row.disapproved_at ? `${row.disapproved_by ?? ""} · ${formatDate(row.disapproved_at)}` : undefined} hideAvatar />
                      ),
                  },
              ]
            : []),
    ];

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>
            <SectionTitle title={`${labels.label} receiving`} subtitle={labels.subtitle} />

            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center", mb: 2 }}>
                <DateRangeField value={{ from: filters.from, to: filters.to }} presets={reportPresets()} onChange={(range) => table.setFilters(range)} />
                <FilterSelect label="Areas" value={filters.area ?? ""} options={areas} onChange={(v) => table.setFilter("area", v)} />
            </Box>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2 }}>
                <ToggleButtonGroup exclusive size="small" value={filters.status} onChange={(_, v: string | null) => v && table.setFilter("status", v)} aria-label="Which sales" sx={toggleSx}>
                    <ToggleButton value="awaiting">
                        Awaiting receipt <Count n={counts.awaiting} />
                    </ToggleButton>
                    <ToggleButton value="received">
                        Received <Count n={counts.received} />
                    </ToggleButton>
                    <ToggleButton value="disapproved">
                        Disapproved <Count n={counts.disapproved} />
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            <TableToolbar search={table.search} onSearch={table.setSearch} placeholder={category === "rental" ? "Search by no., client, agent or address" : "Search by no., client or agent"} />
            <DataTable
                {...table.gridProps}
                columns={columns}
                getRowHeight={() => 56}
                onRowClick={({ row }) => showSale(row.id)}
                aria-label={`${labels.label} sales ${received ? "received" : "awaiting receipt"}`}
                localeText={{ noRowsLabel: received ? "Nothing received in these dates." : disapproved ? "Nothing disapproved in these dates." : `No ${labels.label.toLowerCase()} sales waiting in these dates.` }}
                sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
            />

            <Drawer anchor="right" open={!!saleDetail} onClose={() => showSale(null)} slotProps={{ paper: { sx: { width: { xs: "100%", md: 620 }, backgroundColor: "var(--lr-surface)" } } }}>
                {saleDetail && <SalePanel key={`${saleDetail.id}-${String(saleDetail.property.received_at ?? "")}`} detail={saleDetail} base={base} rentRates={rentRates} onClose={() => showSale(null)} />}
            </Drawer>
        </Container>
    );
}

CommissionReceiving.layout = (page: ReactNode) => <AppLayout children={page} />;

export default CommissionReceiving;
