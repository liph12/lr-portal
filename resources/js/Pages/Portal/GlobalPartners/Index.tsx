import { ReactNode, useState } from "react";
import { Box, ButtonBase, Container } from "@mui/material";
import { CheckRounded } from "@mui/icons-material";
import { Link, router } from "@inertiajs/react";
import { GridColDef } from "@mui/x-data-grid";
import AppLayout from "../../../components/layouts/AppLayout";
import SectionTitle from "../../../components/utils/SectionTitle";
import StyledButton from "../../../components/utils/StyledButton";
import StatusChip from "../../../components/utils/StatusChip";
import ConfirmDialog from "../../../components/utils/ConfirmDialog";
import CountryFlag from "../../../components/utils/CountryFlag";
import DataTable from "../../../components/utils/tables/DataTable";
import TableToolbar from "../../../components/utils/tables/TableToolbar";
import FilterSelect from "../../../components/utils/tables/FilterSelect";
import PersonCell from "../../../components/utils/tables/PersonCell";
import GlobalPartnersNav from "../../../components/partners/GlobalPartnersNav";
import useServerTable, { ServerPage, TableFilters } from "../../../hooks/useServerTable";
import { countries } from "../../../app-data";
import { formatDate } from "../../../helpers/formatDate";
import { formatCount, formatPesoCompact } from "../../../helpers/formatNumber";

interface PartnerRow {
    id: number;
    avatar: string | null;
    name: string | null;
    email: string | null;
    country: string | null;
    country_code: string | null;
    joined: string | null;
    confirmed_at: string | null;
    confirmed_by: string | null;
    sponsor_id: number | null;
    sponsor_name: string | null;
    sponsor_email: string | null;
    team_name: string | null;
    sub_team_name: string | null;
    sales_count: number;
    sales_value: number;
}

interface GlobalPartnersProps {
    partners: ServerPage<PartnerRow>;
    filters: TableFilters & { confirmation: string };
    counts: { all: number; pending: number; confirmed: number };
    // Back office: every partner; a team leader / unit manager: their team's or sub-team's and their own recruits; an
    // agent: their recruits.
    everyone: boolean;
    // Partners recruited by others are in view (back office, leaders): show each one's sponsor.
    showSponsor: boolean;
}

const TABS = [
    { value: "pending", label: "Waiting for confirmation", tone: "pending" },
    { value: "confirmed", label: "Confirmed", tone: "valid" },
    { value: "all", label: "All", tone: "inactive" },
] as const;

// Global partners to confirm: a sponsor confirms the partners they invited; the back office sees and confirms anyone.
function GlobalPartners({ partners, filters, counts, everyone, showSponsor }: GlobalPartnersProps) {
    const table = useServerTable("partners", partners, filters, ["counts"]);
    const [confirming, setConfirming] = useState<PartnerRow | null>(null);

    const columns: GridColDef<PartnerRow>[] = [
        {
            field: "name",
            headerName: "Global partner",
            flex: 1.4,
            minWidth: 220,
            renderCell: ({ row }) => (
                <Link href={`/agents/${row.id}`} style={{ textDecoration: "none", minWidth: 0 }}>
                    <PersonCell name={row.name ?? `Agent #${row.id}`} secondary={row.email ?? undefined} avatar={row.avatar} />
                </Link>
            ),
        },
        { field: "country", headerName: "Country", width: 180, renderCell: ({ row }) => <CountryFlag code={row.country_code} country={row.country} /> },
        {
            field: "team",
            headerName: "Team / sub-team",
            flex: 1.1,
            minWidth: 180,
            renderCell: ({ row }) => <PersonCell hideAvatar name={row.team_name ?? "No team"} secondary={row.sub_team_name ?? undefined} />,
        },
        ...(showSponsor
            ? [
                  {
                      field: "sponsor",
                      headerName: "Sponsor",
                      flex: 1.1,
                      minWidth: 180,
                      sortable: false,
                      renderCell: ({ row }) => <PersonCell hideAvatar name={row.sponsor_name ?? (row.sponsor_id ? `Member #${row.sponsor_id}` : "—")} secondary={row.sponsor_email ?? undefined} />,
                  } as GridColDef<PartnerRow>,
              ]
            : []),
        { field: "joined", headerName: "Joined", width: 120, valueGetter: (_, row) => (row.joined ? formatDate(row.joined) : "—") },
        {
            field: "sales_value",
            headerName: "International sales",
            width: 170,
            renderCell: ({ row }) => <PersonCell hideAvatar name={formatPesoCompact(row.sales_value)} secondary={`${formatCount(row.sales_count)} ${row.sales_count === 1 ? "sale" : "sales"}`} />,
        },
        {
            field: "confirmed_at",
            headerName: "Confirmation",
            width: 200,
            renderCell: ({ row }) =>
                row.confirmed_at ? (
                    <PersonCell hideAvatar name="Confirmed" secondary={`${formatDate(row.confirmed_at)}${row.confirmed_by ? ` · ${row.confirmed_by}` : ""}`} />
                ) : (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <StatusChip status="pending">Waiting</StatusChip>
                        <StyledButton size="small" variant="outlined" startIcon={<CheckRounded />} onClick={() => setConfirming(row)} sx={{ py: 0.25, color: "var(--lr-primary)", borderColor: "var(--lr-outline)" }}>
                            Confirm
                        </StyledButton>
                    </Box>
                ),
        },
    ];

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>
            <SectionTitle
                title="Global Partners"
                subtitle={
                    everyone
                        ? "Every global partner and their sponsor. Confirm the ones still waiting."
                        : showSponsor
                          ? "Global partners on the team you lead and the ones you recruited. Confirm the ones still waiting."
                          : "The global partners you recruited. Confirm the ones still waiting."
                }
            />
            <GlobalPartnersNav />

            <Box role="tablist" aria-label="Confirmation" sx={{ display: "flex", gap: 1, mb: 2, overflowX: "auto", scrollbarWidth: "none" }}>
                {TABS.map((t) => {
                    const active = filters.confirmation === t.value;
                    return (
                        <ButtonBase
                            key={t.value}
                            role="tab"
                            aria-selected={active}
                            onClick={() => table.setFilter("confirmation", t.value)}
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
                            {t.label}
                            <StatusChip status={t.tone} sx={{ ml: 1, height: 20, lineHeight: "20px", px: 1, fontFamily: "Google Sans Code, monospace" }}>
                                {formatCount(counts[t.value])}
                            </StatusChip>
                        </ButtonBase>
                    );
                })}
            </Box>

            <TableToolbar
                search={table.search}
                onSearch={table.setSearch}
                placeholder={showSponsor ? "Search by name, email, team, sub-team, sponsor or country" : "Search by name, email, team, sub-team or country"}
                filters={<FilterSelect label="Countries" value={filters.country} options={countries.map((c) => ({ value: c.id, label: c.label }))} onChange={(v) => table.setFilter("country", v)} />}
            />
            <DataTable {...table.gridProps} columns={columns} getRowHeight={() => 60} aria-label="Global partners" />

            <ConfirmDialog
                open={confirming !== null}
                title={`Confirm ${confirming?.name ?? "this global partner"}?`}
                message="They'll be listed as a confirmed global partner. This is recorded with your name."
                confirmLabel="Confirm"
                tone="primary"
                onConfirm={() => {
                    if (confirming) router.post(`/global-partners/${confirming.id}/confirm`, {}, { preserveScroll: true });
                    setConfirming(null);
                }}
                onClose={() => setConfirming(null)}
            />
        </Container>
    );
}

GlobalPartners.layout = (page: ReactNode) => <AppLayout children={page} />;

export default GlobalPartners;
