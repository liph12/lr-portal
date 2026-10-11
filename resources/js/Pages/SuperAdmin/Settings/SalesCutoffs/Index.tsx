import { ReactNode, useEffect, useState } from "react";
import { Box, Container, IconButton, Switch, Tooltip, Typography } from "@mui/material";
import { AddRounded, DeleteOutlineRounded, EditOutlined } from "@mui/icons-material";
import { GridColDef } from "@mui/x-data-grid";
import { router, useForm } from "@inertiajs/react";
import AppLayout from "../../../../components/layouts/AppLayout";
import SectionTitle from "../../../../components/utils/SectionTitle";
import FlashBanner from "../../../../components/utils/FlashBanner";
import SectionCard from "../../../../components/cards/SectionCard";
import StyledButton from "../../../../components/utils/StyledButton";
import StyledTextField from "../../../../components/utils/StyledTextField";
import StatusChip from "../../../../components/utils/StatusChip";
import ConfirmDialog from "../../../../components/utils/ConfirmDialog";
import DataTable from "../../../../components/utils/tables/DataTable";
import SalesCutoffDialog, { SalesCutoffRow } from "../../../../components/utils/forms/SalesCutoffDialog";
import { formatMonthYear } from "../../../../helpers/salesCutoff";
import { SalesEncodingState } from "../../../../types/app-data-types";

interface SalesCutoffsProps {
    cutoffs: SalesCutoffRow[];
    encoding: SalesEncodingState;
}

const formatLocal = (value: string) =>
    new Date(value).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

function EncodingSwitch({ encoding }: { encoding: SalesEncodingState }) {
    const form = useForm({ enabled: encoding.enabled, message: encoding.message ?? "" });
    const [confirmOff, setConfirmOff] = useState(false);

    useEffect(() => form.setData({ enabled: encoding.enabled, message: encoding.message ?? "" }), [encoding.enabled, encoding.message]);

    const save = (enabled: boolean) => {
        setConfirmOff(false);
        form.transform((d) => ({ ...d, enabled }));
        form.put("/superadmin/settings/sales-encoding", { preserveScroll: true });
    };

    return (
        <SectionCard title="Sale recording">
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                <Switch
                    checked={encoding.enabled}
                    disabled={form.processing}
                    onChange={(e) => (e.target.checked ? save(true) : setConfirmOff(true))}
                    slotProps={{ input: { "aria-label": "Allow recording sales" } }}
                />
                <Box sx={{ flex: 1, minWidth: 220 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: "var(--lr-text-primary)" }}>
                        {encoding.enabled ? "On — sales can be recorded" : "Off — nobody can record sales"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                        An override above every cutoff. Turning it off blocks Record Your Sale for every role, including superadmins.
                    </Typography>
                </Box>
                <StatusChip status={encoding.enabled ? "active" : "deactivated"}>{encoding.enabled ? "Open" : "Closed"}</StatusChip>
            </Box>
            {!encoding.enabled && encoding.message && (
                <Typography variant="body2" sx={{ mt: 1.5, color: "var(--lr-text-body)" }}>
                    Message shown: “{encoding.message}”
                </Typography>
            )}
            <ConfirmDialog
                open={confirmOff}
                title="Turn off sale recording?"
                message={
                    <>
                        Nobody will be able to submit a sale until you turn it back on.
                        <Box sx={{ mt: 2 }}>
                            <StyledTextField
                                name="message"
                                placeholder="Optional message, e.g. Closed for year-end audit until Jan 5."
                                value={form.data.message}
                                error={form.errors.message ?? null}
                                handleChange={(e) => form.setData("message", e.target.value)}
                            />
                        </Box>
                    </>
                }
                confirmLabel="Turn off"
                onConfirm={() => save(false)}
                onClose={() => setConfirmOff(false)}
            />
        </SectionCard>
    );
}

function SalesCutoffs({ cutoffs, encoding }: SalesCutoffsProps) {
    const [editing, setEditing] = useState<SalesCutoffRow | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleting, setDeleting] = useState<SalesCutoffRow | null>(null);

    const open = (cutoff: SalesCutoffRow | null) => {
        setEditing(cutoff);
        setDialogOpen(true);
    };

    const columns: GridColDef<SalesCutoffRow>[] = [
        { field: "month", headerName: "Sales month", flex: 1, minWidth: 160, valueGetter: (_, row) => formatMonthYear(row.month) },
        { field: "cutoff_at", headerName: "Closes on", flex: 1, minWidth: 200, valueGetter: (_, row) => formatLocal(row.cutoff_at) },
        {
            field: "closed",
            headerName: "Status",
            width: 120,
            renderCell: ({ row }) => <StatusChip status={row.closed ? "inactive" : "active"}>{row.closed ? "Closed" : "Open"}</StatusChip>,
        },
        {
            field: "actions",
            headerName: "",
            width: 100,
            sortable: false,
            renderCell: ({ row }) => (
                <>
                    <Tooltip title="Edit cutoff">
                        <IconButton size="small" aria-label={`Edit ${formatMonthYear(row.month)} cutoff`} onClick={() => open(row)}>
                            <EditOutlined fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove cutoff">
                        <IconButton size="small" aria-label={`Remove ${formatMonthYear(row.month)} cutoff`} onClick={() => setDeleting(row)} sx={{ color: "var(--lr-error)" }}>
                            <DeleteOutlineRounded fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </>
            ),
        },
    ];

    return (
        <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4 } }}>
            <SectionTitle title="Sales cutoff" subtitle="When each month's sales close, and whether sales can be recorded at all." />
            <FlashBanner />
            <Box sx={{ mb: 3 }}>
                <EncodingSwitch encoding={encoding} />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2, flexWrap: "wrap" }}>
                <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", flex: 1, minWidth: 240 }}>
                    From a month's cutoff on, its sales (and any earlier month's) can't be recorded, and leaderboards only count sales encoded before it.
                </Typography>
                <StyledButton
                    startIcon={<AddRounded />}
                    variant="contained"
                    onClick={() => open(null)}
                    sx={{ backgroundColor: "var(--lr-primary)", color: "var(--lr-on-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } }}
                >
                    New cutoff
                </StyledButton>
            </Box>
            <DataTable rows={cutoffs} columns={columns} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} aria-label="Sales cutoffs" />

            <SalesCutoffDialog open={dialogOpen} cutoff={editing} onClose={() => setDialogOpen(false)} />
            <ConfirmDialog
                open={deleting !== null}
                title={`Remove the ${deleting ? formatMonthYear(deleting.month) : ""} cutoff?`}
                message="Without its own cutoff, the month stays open until a later month's cutoff passes."
                confirmLabel="Remove"
                onConfirm={() => {
                    if (deleting) router.delete(`/superadmin/settings/sales-cutoffs/${deleting.id}`, { preserveScroll: true });
                    setDeleting(null);
                }}
                onClose={() => setDeleting(null)}
            />
        </Container>
    );
}

SalesCutoffs.layout = (page: ReactNode) => <AppLayout children={page} />;

export default SalesCutoffs;
