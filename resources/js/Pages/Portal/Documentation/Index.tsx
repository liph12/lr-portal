import { ReactNode } from "react";
import { Box, ButtonBase, Container, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { ChatBubbleOutlineRounded, OpenInNewRounded } from "@mui/icons-material";
import { router } from "@inertiajs/react";
import { GridColDef } from "@mui/x-data-grid";
import AppLayout from "../../../components/layouts/AppLayout";
import SectionTitle from "../../../components/utils/SectionTitle";
import FlashBanner from "../../../components/utils/FlashBanner";
import DataTable from "../../../components/utils/tables/DataTable";
import TableToolbar from "../../../components/utils/tables/TableToolbar";
import FilterSelect from "../../../components/utils/tables/FilterSelect";
import PersonCell from "../../../components/utils/tables/PersonCell";
import StatusChip from "../../../components/utils/StatusChip";
import DocumentReviewPanel, { DocumentDetail } from "../../../components/documentation/DocumentReviewPanel";
import { DOCUMENT_STATUS_LABELS, DOCUMENT_TYPE_LABELS } from "../../../components/documentation/documentLabels";
import useAuthUser from "../../../hooks/useAuthUser";
import useServerTable, { ServerPage, TableFilters } from "../../../hooks/useServerTable";
import { formatDate } from "../../../helpers/formatDate";
import { formatCount } from "../../../helpers/formatNumber";

interface DocumentRow {
    id: number;
    agent_id: number;
    avatar: string | null;
    name: string | null;
    email: string | null;
    type: string;
    file_name: string | null;
    file_url: string;
    status: string;
    is_current: boolean;
    remarks: string | null;
    created_at: string | null;
    reviewed_at: string | null;
    reviewer: string | null;
    comments_count: number;
}

interface DocumentationProps {
    documents: ServerPage<DocumentRow>;
    filters: TableFilters;
    counts: Record<string, number>;
    types: string[];
    statuses: string[];
    document: DocumentDetail | null;
}

// Documentation: agents' uploaded requirements, latest per type by default; a row opens the review panel.
function Documentation({ documents, filters, counts, types, statuses, document }: DocumentationProps) {
    const baseUrl = `/${useAuthUser()?.portal ?? "superadmin"}/documentation`;
    const table = useServerTable("documents", documents, filters, ["counts"]);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    // The panel is a partial reload of one prop, keyed by ?document= so a review's redirect reopens it.
    const showDocument = (id: number | null) => {
        const query = Object.fromEntries(new URLSearchParams(window.location.search));
        if (id) query.document = String(id);
        else delete query.document;
        router.get(window.location.pathname, query, { only: ["document"], preserveState: true, preserveScroll: true, replace: true });
    };

    const columns: GridColDef<DocumentRow>[] = [
        {
            field: "name",
            headerName: "Agent",
            flex: 1.4,
            minWidth: 220,
            renderCell: ({ row }) => <PersonCell name={row.name ?? `Agent #${row.agent_id}`} secondary={row.email ?? undefined} avatar={row.avatar} />,
        },
        {
            field: "type",
            headerName: "Document",
            flex: 1.2,
            minWidth: 200,
            renderCell: ({ row }) => (
                <PersonCell
                    hideAvatar
                    name={DOCUMENT_TYPE_LABELS[row.type] ?? row.type}
                    secondary={
                        <Box
                            component="a"
                            href={row.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            sx={{ color: "var(--lr-primary)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 0.5, maxWidth: "100%" }}
                        >
                            <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {row.file_name ?? "Open file"}
                            </Box>
                            <OpenInNewRounded sx={{ fontSize: 13 }} />
                        </Box>
                    }
                />
            ),
        },
        { field: "created_at", headerName: "Uploaded", width: 130, valueGetter: (_, row) => (row.created_at ? formatDate(row.created_at) : "—") },
        {
            field: "status",
            headerName: "Status",
            width: 170,
            renderCell: ({ row }) => (
                <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
                    <StatusChip status={row.status}>{DOCUMENT_STATUS_LABELS[row.status] ?? row.status}</StatusChip>
                    {filters.scope === "all" && !row.is_current && <StatusChip status="inactive">Old</StatusChip>}
                </Box>
            ),
        },
        {
            field: "reviewed_at",
            headerName: "Reviewed",
            width: 170,
            renderCell: ({ row }) => <PersonCell hideAvatar name={row.reviewed_at ? formatDate(row.reviewed_at) : "Not yet"} secondary={row.reviewer ?? undefined} />,
        },
        {
            field: "remarks",
            headerName: "Remarks",
            flex: 1,
            minWidth: 180,
            sortable: false,
            renderCell: ({ row }) => (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap sx={{ flex: 1, color: row.remarks ? "var(--lr-text-body)" : "var(--lr-text-secondary)" }}>
                        {row.remarks ?? "—"}
                    </Typography>
                    {row.comments_count > 0 && (
                        <Box component="span" aria-label={`${row.comments_count} comments`} sx={{ display: "inline-flex", alignItems: "center", gap: 0.25, color: "var(--lr-text-secondary)", fontSize: 12 }}>
                            <ChatBubbleOutlineRounded sx={{ fontSize: 14 }} />
                            {row.comments_count}
                        </Box>
                    )}
                </Box>
            ),
        },
    ];

    const tabs = [{ value: "", label: "All", count: total }, ...statuses.map((s) => ({ value: s, label: DOCUMENT_STATUS_LABELS[s] ?? s, count: counts[s] ?? 0 }))];

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>
            <FlashBanner />
            <SectionTitle title="Documentation" subtitle="Agents' PRC, DHSUD, contracts and other requirements. Open one to validate it, add remarks or comment." />

            <Box role="tablist" aria-label="Document status" sx={{ display: "flex", gap: 1, mb: 2, overflowX: "auto", scrollbarWidth: "none" }}>
                {tabs.map((t) => {
                    const active = String(filters.status ?? "") === t.value;
                    return (
                        <ButtonBase
                            key={t.value || "all"}
                            role="tab"
                            aria-selected={active}
                            onClick={() => table.setFilter("status", t.value)}
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
                            <Box component="span" sx={{ ml: 1, color: "var(--lr-text-secondary)", fontWeight: 500 }}>
                                {formatCount(t.count)}
                            </Box>
                        </ButtonBase>
                    );
                })}
            </Box>

            <TableToolbar
                search={table.search}
                onSearch={table.setSearch}
                placeholder="Search by agent name, email or file name"
                filters={
                    <>
                        <FilterSelect label="Documents" value={filters.type} options={types.map((t) => ({ value: t, label: DOCUMENT_TYPE_LABELS[t] ?? t }))} onChange={(v) => table.setFilter("type", v)} />
                        <ToggleButtonGroup
                            exclusive
                            size="small"
                            value={filters.scope === "all" ? "all" : "latest"}
                            onChange={(_, v) => v && table.setFilter("scope", v === "all" ? "all" : "")}
                            aria-label="Which uploads"
                            sx={{
                                "& .MuiToggleButton-root": { textTransform: "none", px: 1.75, borderColor: "var(--lr-border)", color: "var(--lr-text-body)", borderRadius: 99 },
                                "& .Mui-selected": { color: "var(--lr-primary) !important", backgroundColor: "var(--lr-primary-soft) !important" },
                            }}
                        >
                            <ToggleButton value="latest">Latest only</ToggleButton>
                            <ToggleButton value="all">Every upload</ToggleButton>
                        </ToggleButtonGroup>
                    </>
                }
            />
            <DataTable
                {...table.gridProps}
                columns={columns}
                getRowHeight={() => 60}
                onRowClick={({ row }) => showDocument(row.id)}
                aria-label="Agent documents"
                sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
            />

            <DocumentReviewPanel document={document} baseUrl={baseUrl} statuses={statuses} onClose={() => showDocument(null)} onOpen={showDocument} />
        </Container>
    );
}

Documentation.layout = (page: ReactNode) => <AppLayout children={page} />;

export default Documentation;
