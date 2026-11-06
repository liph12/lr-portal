import { ReactNode, useState } from "react";
import { Box, ButtonBase, Container, Link as MuiLink, Tooltip, Typography } from "@mui/material";
import { CheckRounded, CloseRounded, OpenInNewRounded } from "@mui/icons-material";
import { router, useForm } from "@inertiajs/react";
import { GridColDef } from "@mui/x-data-grid";
import AppLayout from "../../../components/layouts/AppLayout";
import SectionTitle from "../../../components/utils/SectionTitle";
import StyledButton from "../../../components/utils/StyledButton";
import StyledTextField from "../../../components/utils/StyledTextField";
import StatusChip from "../../../components/utils/StatusChip";
import ConfirmDialog from "../../../components/utils/ConfirmDialog";
import FormDialog from "../../../components/utils/forms/FormDialog";
import FieldLabel from "../../../components/utils/forms/FieldLabel";
import DataTable from "../../../components/utils/tables/DataTable";
import TableToolbar from "../../../components/utils/tables/TableToolbar";
import PersonCell from "../../../components/utils/tables/PersonCell";
import useServerTable, { ServerPage, TableFilters } from "../../../hooks/useServerTable";
import { formatDate } from "../../../helpers/formatDate";
import { formatCount } from "../../../helpers/formatNumber";

type Status = "pending" | "approved" | "disapproved";

interface RequestRow {
    id: number;
    agent_id: number;
    avatar: string | null;
    name: string | null;
    email: string | null;
    file: string;
    notes: string | null;
    status: Status;
    decline_reason: string | null;
    submitted_at: string;
    reviewed_at: string | null;
    reviewed_by: string | null;
}

interface ReactivationRequestsProps {
    submissions: ServerPage<RequestRow>;
    filters: TableFilters & { status: Status | "all" };
    counts: Record<Status | "all", number>;
    // Back office: nationwide; anyone else: their recruits, led teams/sub-teams, office areas.
    everyone: boolean;
}

const TABS: { value: Status | "all"; label: string; tone: string }[] = [
    { value: "pending", label: "Waiting for review", tone: "pending" },
    { value: "approved", label: "Approved", tone: "valid" },
    { value: "disapproved", label: "Disapproved", tone: "invalid" },
    { value: "all", label: "All", tone: "inactive" },
];

const STATUS_LABELS: Record<Status, string> = { pending: "Waiting", approved: "Approved", disapproved: "Disapproved" };
const TONES: Record<Status, string> = { pending: "pending", approved: "valid", disapproved: "invalid" };
const isImage = (url: string) => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);

// Reactivation requests: agents FIRE activated (because they'd never sold) who then had no sale within the window. A
// supporting file + notes, for the back office to approve (restarts the window) or disapprove (needs a reason).
function ReactivationRequests({ submissions, filters, counts, everyone }: ReactivationRequestsProps) {
    const table = useServerTable("submissions", submissions, filters, ["counts"]);
    const [approving, setApproving] = useState<RequestRow | null>(null);
    const [disapproving, setDisapproving] = useState<RequestRow | null>(null);
    const reject = useForm<{ reason: string }>({ reason: "" });

    const closeReject = () => {
        setDisapproving(null);
        reject.reset();
        reject.clearErrors();
    };

    const columns: GridColDef<RequestRow>[] = [
        {
            field: "name",
            headerName: "Agent",
            flex: 1.4,
            minWidth: 220,
            renderCell: ({ row }) => <PersonCell name={row.name ?? `Agent #${row.agent_id}`} secondary={row.email ?? undefined} avatar={row.avatar} />,
        },
        { field: "submitted_at", headerName: "Sent", width: 120, valueGetter: (_, row) => formatDate(row.submitted_at) },
        {
            field: "file",
            headerName: "File",
            width: 110,
            sortable: false,
            renderCell: ({ row }) => (
                <MuiLink href={row.file} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "var(--lr-primary)", fontSize: 14 }}>
                    {isImage(row.file) ? (
                        <Box component="img" src={row.file} alt="Supporting file" sx={{ width: 44, height: 44, objectFit: "cover", borderRadius: 1, border: "1px solid var(--lr-border)" }} />
                    ) : (
                        <>
                            View <OpenInNewRounded sx={{ fontSize: 16 }} />
                        </>
                    )}
                </MuiLink>
            ),
        },
        {
            field: "notes",
            headerName: "Notes",
            flex: 1,
            minWidth: 180,
            sortable: false,
            valueGetter: (_, row) => row.notes ?? "—",
        },
        {
            field: "reviewed_at",
            headerName: "Review",
            flex: 1.2,
            minWidth: 240,
            sortable: false,
            renderCell: ({ row }) =>
                row.status === "pending" ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <StyledButton size="small" variant="outlined" startIcon={<CheckRounded />} onClick={() => setApproving(row)} sx={{ py: 0.25, color: "var(--lr-success)", borderColor: "var(--lr-outline)" }}>
                            Approve
                        </StyledButton>
                        <StyledButton size="small" variant="outlined" startIcon={<CloseRounded />} onClick={() => setDisapproving(row)} sx={{ py: 0.25, color: "var(--lr-error)", borderColor: "var(--lr-outline)" }}>
                            Disapprove
                        </StyledButton>
                    </Box>
                ) : (
                    <Tooltip title={row.decline_reason ?? ""} disableHoverListener={!row.decline_reason}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                            <StatusChip status={TONES[row.status]}>{STATUS_LABELS[row.status]}</StatusChip>
                            <PersonCell hideAvatar name={row.reviewed_by ?? "—"} secondary={row.status === "disapproved" && row.decline_reason ? row.decline_reason : row.reviewed_at ? formatDate(row.reviewed_at) : undefined} />
                        </Box>
                    </Tooltip>
                ),
        },
    ];

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>
            <SectionTitle
                title="Reactivation Requests"
                subtitle={
                    everyone
                        ? "Agents FIRE activated who then had no sale in time, nationwide. Check each file, then approve or disapprove."
                        : "Agents FIRE activated who then had no sale in time, within your reach: your recruits, and the team or sub-team you lead. Check each file, then approve or disapprove."
                }
            />

            <Box role="tablist" aria-label="Review status" sx={{ display: "flex", gap: 1, mb: 2, overflowX: "auto", scrollbarWidth: "none" }}>
                {TABS.map((t) => {
                    const active = filters.status === t.value;
                    return (
                        <ButtonBase
                            key={t.value}
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
                            <StatusChip status={t.tone} sx={{ ml: 1, height: 20, lineHeight: "20px", px: 1, fontFamily: "Google Sans Code, monospace" }}>
                                {formatCount(counts[t.value])}
                            </StatusChip>
                        </ButtonBase>
                    );
                })}
            </Box>

            <TableToolbar search={table.search} onSearch={table.setSearch} placeholder="Search name or email" />
            <DataTable {...table.gridProps} columns={columns} getRowHeight={() => 64} aria-label="Reactivation requests" />

            <ConfirmDialog
                open={approving !== null}
                title={`Reactivate ${approving?.name ?? "this agent"}'s account?`}
                message="Their FIRE-triggered window restarts from today. This is recorded with your name."
                confirmLabel="Reactivate"
                tone="primary"
                onConfirm={() => {
                    if (approving) router.post(`/reactivation-requests/${approving.agent_id}/approve`, {}, { preserveScroll: true });
                    setApproving(null);
                }}
                onClose={() => setApproving(null)}
            />

            <FormDialog
                open={disapproving !== null}
                title={`Disapprove ${disapproving?.name ?? "this agent"}'s request?`}
                submitLabel="Disapprove"
                processing={reject.processing}
                onSubmit={() => disapproving && reject.post(`/reactivation-requests/${disapproving.agent_id}/disapprove`, { preserveScroll: true, onSuccess: closeReject })}
                onClose={closeReject}
            >
                <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                    They'll see your reason, and may send another request.
                </Typography>
                <div>
                    <FieldLabel text="Reason" required />
                    <StyledTextField
                        name="reason"
                        value={reject.data.reason}
                        error={reject.errors.reason ?? null}
                        handleChange={(e) => reject.setData("reason", e.target.value)}
                        props={{ multiline: true, minRows: 3, placeholder: "e.g. The file doesn't show a sale in progress." }}
                    />
                </div>
            </FormDialog>
        </Container>
    );
}

ReactivationRequests.layout = (page: ReactNode) => <AppLayout children={page} />;

export default ReactivationRequests;
