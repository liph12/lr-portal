import { ElementType, ReactNode } from "react";
import { Box, ButtonBase, Container, Drawer, Grid, IconButton, Typography } from "@mui/material";
import { CloseRounded, ApartmentRounded, ChevronRightRounded, HomeWorkRounded, PlaceRounded, PublicRounded, StorefrontRounded } from "@mui/icons-material";
import { Link, router } from "@inertiajs/react";
import { GridColDef } from "@mui/x-data-grid";
import AppLayout from "../../../components/layouts/AppLayout";
import SectionTitle from "../../../components/utils/SectionTitle";
import FlashBanner from "../../../components/utils/FlashBanner";
import StyledButton from "../../../components/utils/StyledButton";
import StatusMenu from "../../../components/utils/StatusMenu";
import StatusChip from "../../../components/utils/StatusChip";
import DataTable from "../../../components/utils/tables/DataTable";
import TableToolbar from "../../../components/utils/tables/TableToolbar";
import PersonCell from "../../../components/utils/tables/PersonCell";
import FileLink from "../../../components/sales/FileLink";
import AgentSalesPanel, { AgentSales } from "../../../components/sales/AgentSalesPanel";
import SaleDetailsForm, { EditOptions, SaleDetail } from "../../../components/sales/SaleDetailsForm";
import DateRangeField from "../../../components/utils/DateRangeField";
import { reportPresets } from "../../../helpers/dateRanges";
import useAuthUser from "../../../hooks/useAuthUser";
import useServerTable, { ServerPage, TableFilters } from "../../../hooks/useServerTable";
import { formatDate } from "../../../helpers/formatDate";
import { formatCount, formatPeso } from "../../../helpers/formatNumber";
import { SaleCategory } from "../../../types/app-data-types";

type Category = SaleCategory;

interface SaleRow {
    id: number;
    agent_id: number | null;
    unit_number: string | null;
    sale_status: string;
    created_at: string | null;
    validated_at: string | null;
    validated_by: string | null;
    reservation_date: string | null;
    value: number;
    property_type: string | null;
    client_first_name: string | null;
    client_last_name: string | null;
    client_email: string | null;
    client_mobile: string | null;
    client_country: string | null;
    agent_name: string | null;
    agent_avatar: string | null;
    area: string;
    project_name?: string | null;
    developer_id?: number | null;
    developer?: string | null;
    proof_of_transaction?: string | null;
    brokerage_area_id?: number | null;
    brokerage_area?: string | null;
    closing_agent?: string | null;
    partner_agent?: string | null;
    remittance_slip?: string | null;
    deposit_slip?: string | null;
}

interface SalesValidationProps {
    filters: TableFilters & { area: string | null; category: Category | null; status: string; from: string; to: string };
    statuses: string[];
    categories: Category[];
    areaName: string | null;
    areas: { key: string; name: string; pending: number }[] | null;
    counts: Record<Category, Record<string, number>> | null;
    sales: ServerPage<SaleRow> | null;
    agentSales: AgentSales | null;
    editOptions: EditOptions | null;
    saleDetail: SaleDetail | null;
    // An office secretary with one area: there's no area to pick or change.
    singleArea: boolean;
}

const STATUS_LABELS: Record<string, string> = { pending: "Pending", valid: "Validated", invalid: "Invalid", cancelled: "Cancelled" };
const CATEGORY: Record<Category, { title: string; icon: ElementType; files: string }> = {
    project: { title: "Project sales", icon: ApartmentRounded, files: "Proof of transaction" },
    brokerage: { title: "Brokerage sales", icon: StorefrontRounded, files: "Remittance and deposit slips" },
    rental: { title: "Rental sales", icon: HomeWorkRounded, files: "Remittance and deposit slips" },
};
const CONFIRM = {
    invalid: "It stops counting in reports and leaderboards. The agent's record keeps the change in its history.",
    cancelled: "It stops counting in reports and leaderboards. The agent's record keeps the change in its history.",
};

const cardSx = {
    height: "100%",
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 2,
    p: 2.5,
    textAlign: "left",
    border: "1px solid var(--lr-border)",
    borderRadius: 3,
    backgroundColor: "var(--lr-surface)",
    transition: "box-shadow 0.2s ease",
    ":hover": { boxShadow: "0 1px 3px rgba(60,64,67,.15), 0 4px 8px rgba(60,64,67,.1)" },
};

const iconSx = {
    width: 44,
    height: 44,
    borderRadius: "50%",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--lr-primary)",
    backgroundColor: "var(--lr-primary-soft)",
};

const clientName = (r: SaleRow) => [r.client_first_name, r.client_last_name].filter(Boolean).join(" ") || "No client name";

// Sales validation: pick an area, then a category, then validate its sales status by status.
function SalesValidation({ filters, statuses, categories, areaName, areas, counts, sales, agentSales, editOptions, saleDetail, singleArea }: SalesValidationProps) {
    // Back office in its portal; an office secretary (no portal) at the shared /sales-validation.
    const portal = useAuthUser()?.portal;
    const baseUrl = portal ? `/${portal}/sales-validation` : "/sales-validation";
    // Every step keeps the reservation-date range (default: this month).
    const range = { from: filters.from, to: filters.to };
    const go = (query: Record<string, string>) => router.get(baseUrl, { ...range, ...query }, { preserveScroll: false });
    // The agent panel is a partial reload of one prop, keyed by ?agent= so a status change's redirect reopens it.
    const showAgent = (id: number | null, allDates = false) => {
        const query = Object.fromEntries(new URLSearchParams(window.location.search));
        delete query.agent;
        delete query.agent_dates;
        if (id) query.agent = String(id);
        if (id && allDates) query.agent_dates = "all";
        router.get(baseUrl, query, { only: ["agentSales"], preserveState: true, preserveScroll: true, replace: true });
    };
    // A sale opens (drawer from the table, or expanded inside the agent panel) by ?sale=, a partial reload of one prop.
    const showSale = (id: number | null) => {
        const query = Object.fromEntries(new URLSearchParams(window.location.search));
        delete query.sale;
        if (id) query.sale = String(id);
        router.get(baseUrl, query, { only: ["saleDetail"], preserveState: true, preserveScroll: true, replace: true });
    };
    const changeRange = (next: { from: string; to: string }) =>
        router.get(
            baseUrl,
            Object.fromEntries(Object.entries({ area: filters.area, category: filters.category, status: filters.category ? filters.status : null, ...next }).filter(([, v]) => v)) as Record<string, string>,
            { preserveScroll: true, preserveState: true },
        );

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>
            <FlashBanner />
            <SectionTitle
                title="Sales validation"
                subtitle={
                    !filters.area
                        ? "Pick an area to validate its sales reserved in this range."
                        : !filters.category
                          ? `${areaName}: pick the kind of sale.`
                          : `${areaName} · ${CATEGORY[filters.category].title}`
                }
                action={
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                        <DateRangeField value={range} presets={reportPresets()} onChange={changeRange} />
                        {filters.area && filters.category && (
                            <StyledButton size="small" variant="text" onClick={() => go({ area: filters.area! })} sx={{ color: "var(--lr-primary)" }}>
                                Change sale type
                            </StyledButton>
                        )}
                        {filters.area && !singleArea && (
                            <StyledButton size="small" variant="text" onClick={() => go({})} sx={{ color: "var(--lr-primary)" }}>
                                Change area
                            </StyledButton>
                        )}
                    </Box>
                }
            />

            {!filters.area && areas && <AreaStep areas={areas} onPick={(area) => go({ area })} />}

            {filters.area && !filters.category && counts && (
                <Grid container spacing={2}>
                    {categories.map((c) => {
                        const Icon = CATEGORY[c].icon;
                        return (
                            <Grid key={c} size={{ xs: 12, md: 4 }}>
                                <Link href={baseUrl} data={{ ...range, area: filters.area!, category: c }} style={{ textDecoration: "none", display: "block", height: "100%" }}>
                                    <Box sx={{ ...cardSx, alignItems: "flex-start" }}>
                                        <Box sx={iconSx}>
                                            <Icon />
                                        </Box>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="body1" sx={{ fontWeight: 500, color: "var(--lr-text-primary)" }}>
                                                {CATEGORY[c].title}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                                                {CATEGORY[c].files}
                                            </Typography>
                                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1.5 }}>
                                                {statuses.map((s) => (
                                                    <StatusCount key={s} status={s} count={counts[c][s] ?? 0} />
                                                ))}
                                            </Box>
                                        </Box>
                                        <ChevronRightRounded sx={{ color: "var(--lr-text-secondary)", alignSelf: "center" }} />
                                    </Box>
                                </Link>
                            </Grid>
                        );
                    })}
                </Grid>
            )}

            {filters.area && filters.category && sales && counts && (
                <SalesStep
                    filters={filters as SalesValidationProps["filters"] & { category: Category }}
                    statuses={statuses}
                    counts={counts[filters.category]}
                    sales={sales}
                    baseUrl={baseUrl}
                    onAgent={(id) => showAgent(id)}
                    onOpen={(id) => showSale(id)}
                />
            )}

            <AgentSalesPanel
                data={agentSales}
                statuses={statuses}
                statusLabels={STATUS_LABELS}
                baseUrl={baseUrl}
                rangeLabel={`${formatDate(filters.from)} – ${formatDate(filters.to)}`}
                onClose={() => showAgent(null)}
                onAllDates={(all) => showAgent(agentSales?.agent.id ?? null, all)}
                expanded={agentSales ? saleDetail : null}
                onToggleSale={(id) => showSale(saleDetail?.id === id ? null : id)}
                renderSale={(detail) => (
                    <SaleDetailsForm key={`${detail.id}-${detail.history.length}`} detail={detail} options={editOptions} statuses={statuses} statusLabels={STATUS_LABELS} baseUrl={baseUrl} />
                )}
            />

            {/* From the table: the whole sale in a side panel (the agent panel expands it in place instead). */}
            <Drawer
                anchor="right"
                open={!!saleDetail && !agentSales}
                onClose={() => showSale(null)}
                slotProps={{ paper: { sx: { width: { xs: "100%", md: 760 }, backgroundColor: "var(--lr-surface)" } } }}
            >
                {saleDetail && (
                    <Box sx={{ p: { xs: 2, sm: 3 } }}>
                        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                            <Typography variant="h6" sx={{ flex: 1, fontSize: 18, color: "var(--lr-text-primary)" }}>
                                {CATEGORY[saleDetail.category].title.replace(/s$/, "")} of {[saleDetail.client.client_first_name, saleDetail.client.client_last_name].filter(Boolean).join(" ") || "an unnamed client"}
                            </Typography>
                            <IconButton aria-label="Close" onClick={() => showSale(null)}>
                                <CloseRounded />
                            </IconButton>
                        </Box>
                        <SaleDetailsForm key={`${saleDetail.id}-${saleDetail.history.length}`} detail={saleDetail} options={editOptions} statuses={statuses} statusLabels={STATUS_LABELS} baseUrl={baseUrl} />
                    </Box>
                )}
            </Drawer>
        </Container>
    );
}

// "Pending 46" as a chip in the status's colour: amber pending, green validated, red invalid, grey cancelled.
function StatusCount({ status, count }: { status: string; count: number }) {
    return (
        <StatusChip status={status}>
            {STATUS_LABELS[status]}
            <Box component="span" sx={{ ml: 0.75, fontFamily: "Google Sans Code, monospace", fontWeight: 600 }}>
                {formatCount(count)}
            </Box>
        </StatusChip>
    );
}

function AreaStep({ areas, onPick }: { areas: NonNullable<SalesValidationProps["areas"]>; onPick: (area: string) => void }) {
    return (
        <Grid container spacing={2}>
            {areas.map((a) => (
                <Grid key={a.key} size={{ xs: 12, sm: 6, lg: 4 }}>
                    <ButtonBase onClick={() => onPick(a.key)} sx={cardSx}>
                        <Box sx={iconSx}>{a.key === "all" ? <PublicRounded /> : <PlaceRounded />}</Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body1" sx={{ fontWeight: 500, color: "var(--lr-text-primary)" }}>
                                {a.name}
                            </Typography>
                            <Typography variant="body2" sx={{ color: a.pending ? "var(--lr-warning)" : "var(--lr-text-secondary)", fontWeight: a.pending ? 500 : 400 }}>
                                {a.pending ? `${formatCount(a.pending)} pending` : "Nothing pending"}
                            </Typography>
                        </Box>
                        <ChevronRightRounded sx={{ color: "var(--lr-text-secondary)" }} />
                    </ButtonBase>
                </Grid>
            ))}
        </Grid>
    );
}

interface SalesStepProps {
    filters: SalesValidationProps["filters"] & { category: Category };
    statuses: string[];
    counts: Record<string, number>;
    sales: ServerPage<SaleRow>;
    baseUrl: string;
    onAgent: (agentId: number) => void;
    onOpen: (saleId: number) => void;
}

// Row clicks open the sale; controls inside a row stop the click so they don't open it too.
const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

function SalesStep({ filters, statuses, counts, sales, baseUrl, onAgent, onOpen }: SalesStepProps) {
    const table = useServerTable("sales", sales, filters, ["counts"]);
    const category = filters.category;

    const property: GridColDef<SaleRow> =
        category === "project"
            ? { field: "project", headerName: "Project / developer", flex: 1.3, minWidth: 200, sortable: false, renderCell: ({ row }) => <PersonCell hideAvatar name={row.project_name ?? "—"} secondary={row.developer ?? undefined} /> }
            : category === "brokerage"
              ? { field: "brokerage_area", headerName: "Brokerage area", flex: 1.1, minWidth: 170, sortable: false, renderCell: ({ row }) => <PersonCell hideAvatar name={row.brokerage_area ?? "—"} secondary={row.property_type ?? undefined} /> }
              : {
                    field: "closing_agent",
                    headerName: "Closing / partner agent",
                    flex: 1.1,
                    minWidth: 180,
                    sortable: false,
                    renderCell: ({ row }) => <PersonCell hideAvatar name={row.closing_agent ?? "—"} secondary={row.partner_agent ? `Partner: ${row.partner_agent}` : undefined} />,
                };

    const columns: GridColDef<SaleRow>[] = [
        {
            field: "client",
            headerName: "Client",
            flex: 1.3,
            minWidth: 200,
            renderCell: ({ row }) => (
                <PersonCell hideAvatar name={clientName(row)} secondary={[row.client_mobile, row.client_email, row.client_country].filter(Boolean).join(" · ") || undefined} />
            ),
        },
        {
            field: "agent",
            headerName: "Agent",
            flex: 1.1,
            minWidth: 180,
            renderCell: ({ row }) =>
                row.agent_id ? (
                    <ButtonBase onClick={(e) => { stop(e); onAgent(row.agent_id!); }} aria-label={`Sales of ${row.agent_name}`} sx={{ borderRadius: 2, textAlign: "left", justifyContent: "flex-start", maxWidth: "100%", "& .MuiTypography-body2": { color: "var(--lr-primary)" } }}>
                        <PersonCell name={row.agent_name ?? "Agent"} avatar={row.agent_avatar} secondary={row.area} />
                    </ButtonBase>
                ) : (
                    <PersonCell name={row.agent_name ?? "No agent"} avatar={row.agent_avatar} secondary={`${row.area} · recorded by staff`} />
                ),
        },
        property,
        {
            field: "unit",
            headerName: "Unit",
            width: 140,
            sortable: false,
            renderCell: ({ row }) => <PersonCell hideAvatar name={row.unit_number ?? "—"} secondary={category === "project" ? (row.property_type ?? undefined) : undefined} />,
        },
        { field: "value", headerName: "Contract price", width: 150, renderCell: ({ row }) => formatPeso(row.value) },
        { field: "reservation_date", headerName: "Reserved", width: 120, valueGetter: (_, row) => (row.reservation_date ? formatDate(row.reservation_date) : "—") },
        { field: "created_at", headerName: "Date added", width: 120, valueGetter: (_, row) => (row.created_at ? formatDate(row.created_at) : "—") },
        {
            field: "files",
            headerName: category === "project" ? "Proof of transaction" : "Slips",
            width: category === "project" ? 170 : 220,
            sortable: false,
            renderCell: ({ row }) =>
                category === "project" ? (
                    <FileLink url={row.proof_of_transaction ?? null} label="Proof" />
                ) : (
                    <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                        <FileLink url={row.remittance_slip ?? null} label="Remittance" />
                        <FileLink url={row.deposit_slip ?? null} label="Deposit" />
                    </Box>
                ),
        },
        {
            field: "status",
            headerName: "Status",
            width: 150,
            sortable: false,
            renderCell: ({ row }) => (
                <Box onClick={stop}>
                    <StatusMenu status={row.sale_status} statuses={statuses} labels={STATUS_LABELS} url={`${baseUrl}/${row.id}`} subject={`the sale of ${clientName(row)}`} confirm={CONFIRM} />
                </Box>
            ),
        },
        ...(filters.status !== "pending"
            ? [
                  {
                      field: "validated_at",
                      headerName: "Validated",
                      width: 160,
                      sortable: false,
                      renderCell: ({ row }) => <PersonCell hideAvatar name={row.validated_at ? formatDate(row.validated_at) : "Before this portal"} secondary={row.validated_by ?? undefined} />,
                  } as GridColDef<SaleRow>,
              ]
            : []),
    ];

    return (
        <>
            <Box role="tablist" aria-label="Sale status" sx={{ display: "flex", gap: 1, mb: 2, overflowX: "auto", scrollbarWidth: "none" }}>
                {statuses.map((s) => {
                    const active = filters.status === s;
                    return (
                        <ButtonBase
                            key={s}
                            role="tab"
                            aria-selected={active}
                            onClick={() => table.setFilter("status", s)}
                            sx={{
                                px: 2,
                                py: 0.75,
                                borderRadius: 99,
                                fontSize: 14,
                                whiteSpace: "nowrap",
                                fontWeight: active ? 600 : 500,
                                color: active ? "var(--lr-primary)" : "var(--lr-text-body)",
                                backgroundColor: active ? "var(--lr-primary-soft)" : "var(--lr-surface-container)",
                            }}
                        >
                            {STATUS_LABELS[s]}
                            <StatusChip status={s} sx={{ ml: 1, height: 20, lineHeight: "20px", px: 1, fontFamily: "Google Sans Code, monospace" }}>
                                {formatCount(counts[s] ?? 0)}
                            </StatusChip>
                        </ButtonBase>
                    );
                })}
            </Box>
            <TableToolbar
                search={table.search}
                onSearch={table.setSearch}
                placeholder={category === "project" ? "Search client, agent, unit or project" : "Search client, agent or unit"}
            />
            <DataTable
                {...table.gridProps}
                columns={columns}
                getRowHeight={() => 64}
                onRowClick={({ row }) => onOpen(row.id)}
                aria-label={`${CATEGORY[category].title}, ${STATUS_LABELS[filters.status]}`}
                sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
            />
        </>
    );
}

SalesValidation.layout = (page: ReactNode) => <AppLayout children={page} />;

export default SalesValidation;
