import { ReactNode, useState } from "react";
import { Box, Chip, Container, FormControlLabel, Grid, Switch, Typography } from "@mui/material";
import { AddRounded, DeleteOutlineRounded, EditRounded, OpenInNewRounded, StarRounded } from "@mui/icons-material";
import { Link, router, useForm } from "@inertiajs/react";
import AppLayout from "../../../../components/layouts/AppLayout";
import SectionTitle from "../../../../components/utils/SectionTitle";
import StyledButton from "../../../../components/utils/StyledButton";
import StyledTextField from "../../../../components/utils/StyledTextField";
import ConfirmDialog from "../../../../components/utils/ConfirmDialog";
import FormDialog from "../../../../components/utils/forms/FormDialog";
import FieldLabel from "../../../../components/utils/forms/FieldLabel";
import NatconTrophyIcon from "../../../../components/natcon/NatconTrophyIcon";
import { NatconSettings as Edition } from "../../../../components/natcon/NatconPeriod";
import { formatDate, formatDateTime } from "../../../../helpers/formatDate";
import { formatPeso } from "../../../../helpers/formatNumber";

interface NatconSettingsProps {
    editions: Edition[];
}

interface EditionForm {
    year: string;
    name: string;
    from: string;
    to: string;
    cutoff_at: string;
    qualifier_amount: string;
    rental_from: string;
    rental_to: string;
    rental_cutoff: string;
    is_default: boolean;
}

const nextYear = (date: string) => (date ? `${Number(date.slice(0, 4)) + 1}${date.slice(4)}` : "");

// An edition as the form holds it ("2026-08-12 17:00:00" → the datetime-local "2026-08-12T17:00").
const toForm = (e: Edition): EditionForm => ({
    year: String(e.year),
    name: e.name,
    from: e.from,
    to: e.to,
    cutoff_at: e.cutoff_at ? e.cutoff_at.slice(0, 16).replace(" ", "T") : "",
    qualifier_amount: String(e.qualifier_amount),
    rental_from: e.rental_from,
    rental_to: e.rental_to,
    rental_cutoff: e.rental_cutoff,
    is_default: e.is_default,
});

// A new edition starts as the latest one a year later (dates moved on, same threshold, cutoff to set).
const nextEdition = (latest: Edition | undefined): EditionForm =>
    latest
        ? { ...toForm(latest), year: String(latest.year + 1), name: `NATCON ${latest.year + 1}`, from: nextYear(latest.from), to: nextYear(latest.to), cutoff_at: "", rental_from: nextYear(latest.rental_from), rental_to: nextYear(latest.rental_to), rental_cutoff: nextYear(latest.rental_cutoff), is_default: false }
        : { year: String(new Date().getFullYear()), name: `NATCON ${new Date().getFullYear()}`, from: "", to: "", cutoff_at: "", qualifier_amount: "", rental_from: "", rental_to: "", rental_cutoff: "", is_default: true };

function Fact({ label, value }: { label: string; value: string }) {
    return (
        <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                {label}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, color: "var(--lr-text-primary)" }}>
                {value}
            </Typography>
        </Box>
    );
}

// Settings › NATCON: the editions (NATCON 2026, 2027…), each with its own period, specific cutoff, qualifier amount and Top
// Rent Managers period; the default is what /natcon opens on.
function NatconSettings({ editions }: NatconSettingsProps) {
    const [editing, setEditing] = useState<Edition | "new" | null>(null);
    const [deleting, setDeleting] = useState<Edition | null>(null);
    const form = useForm<EditionForm>(nextEdition(editions[0]));
    const field = (name: keyof EditionForm, label: string, type = "date", hint?: string) => (
        <Box>
            <FieldLabel text={label} required={name !== "cutoff_at"} />
            <StyledTextField
                type={type}
                name={name}
                value={form.data[name] as string}
                error={form.errors[name] ?? null}
                handleChange={(e) => form.setData(name, e.target.value as never)}
                props={type === "text" && name === "qualifier_amount" ? { slotProps: { htmlInput: { inputMode: "decimal" as const } } } : undefined}
            />
            {hint && (
                <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                    {hint}
                </Typography>
            )}
        </Box>
    );

    const open = (edition: Edition | "new") => {
        form.clearErrors();
        form.setData(edition === "new" ? nextEdition(editions[0]) : toForm(edition));
        setEditing(edition);
    };
    const save = () => {
        form.transform((d) => ({ ...d, qualifier_amount: d.qualifier_amount.replace(/,/g, "").trim() }));
        const options = { preserveScroll: true, onSuccess: () => setEditing(null) };
        editing === "new" || editing === null ? form.post("/superadmin/settings/natcon", options) : form.put(`/superadmin/settings/natcon/${editing.id}`, options);
    };

    return (
        <Container maxWidth="md" sx={{ py: { xs: 3, sm: 4 } }}>
            <SectionTitle
                title="NATCON"
                subtitle="Each NATCON with its own period, cutoff and qualifier amount. The default is what NATCON opens on; the others are a click away."
                action={
                    <StyledButton variant="contained" startIcon={<AddRounded />} onClick={() => open("new")} sx={{ flexShrink: 0, whiteSpace: "nowrap", backgroundColor: "var(--lr-primary)", color: "var(--lr-on-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } }}>
                        Add NATCON
                    </StyledButton>
                }
            />

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {editions.map((e) => (
                    <Box key={e.id} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: "1px solid", borderColor: e.is_default ? "var(--lr-primary)" : "var(--lr-border)", backgroundColor: "var(--lr-surface)", boxShadow: "var(--lr-shadow)" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mb: 2 }}>
                            <NatconTrophyIcon sx={{ fontSize: 30 }} />
                            <Typography sx={{ fontSize: 18, fontWeight: 700, color: "var(--lr-text-primary)" }}>{e.name}</Typography>
                            {e.is_default && <Chip size="small" icon={<StarRounded />} label="Default" sx={{ height: 24, fontWeight: 600, color: "var(--lr-primary)", backgroundColor: "var(--lr-primary-soft)", "& .MuiChip-icon": { color: "var(--lr-primary)" } }} />}
                            <Box sx={{ ml: "auto", display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                                <Link href={`/natcon/${e.year}`} style={{ textDecoration: "none" }}>
                                    <StyledButton size="small" startIcon={<OpenInNewRounded />} sx={{ color: "var(--lr-primary)" }}>
                                        Open
                                    </StyledButton>
                                </Link>
                                {!e.is_default && (
                                    <StyledButton size="small" startIcon={<StarRounded />} onClick={() => router.patch(`/superadmin/settings/natcon/${e.id}/default`, {}, { preserveScroll: true })} sx={{ color: "var(--lr-primary)" }}>
                                        Make default
                                    </StyledButton>
                                )}
                                <StyledButton size="small" startIcon={<EditRounded />} onClick={() => open(e)} sx={{ color: "var(--lr-primary)" }}>
                                    Edit
                                </StyledButton>
                                {!e.is_default && (
                                    <StyledButton size="small" startIcon={<DeleteOutlineRounded />} onClick={() => setDeleting(e)} sx={{ color: "var(--lr-error)" }}>
                                        Delete
                                    </StyledButton>
                                )}
                            </Box>
                        </Box>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Fact label="Period (reservation date)" value={`${formatDate(e.from)} – ${formatDate(e.to)}`} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Fact label="Cutoff — sales encoded by" value={e.cutoff_at ? formatDateTime(e.cutoff_at) : "Not set — everything so far counts"} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Fact label="Qualifier" value={formatPeso(e.qualifier_amount)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Fact label="Top Rent Managers" value={`${formatDate(e.rental_from)} – ${formatDate(e.rental_to)} · cutoff ${formatDate(e.rental_cutoff)}`} />
                            </Grid>
                        </Grid>
                    </Box>
                ))}
                {editions.length === 0 && (
                    <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                        No NATCON yet. Add the first one.
                    </Typography>
                )}
            </Box>

            <FormDialog open={editing !== null} title={editing === "new" ? "Add a NATCON" : `Edit ${editing ? editing.name : "NATCON"}`} submitLabel="Save" processing={form.processing} onSubmit={save} onClose={() => setEditing(null)}>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 4 }}>{field("year", "Year", "number")}</Grid>
                    <Grid size={{ xs: 12, sm: 8 }}>{field("name", "Name", "text")}</Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>{field("from", "Period from (reservation date)")}</Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>{field("to", "Period to")}</Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>{field("cutoff_at", "Cutoff (date and time)", "datetime-local", "Sales encoded after this don't count. Leave empty until it's decided.")}</Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>{field("qualifier_amount", "Qualifier amount (₱)", "text", "e.g. 43000000 — valid sales of every category together.")}</Grid>
                    <Grid size={12}>
                        <Typography sx={{ mt: 1, fontWeight: 600, color: "var(--lr-text-primary)" }}>Top Rent Managers</Typography>
                        <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                            Rentals run on a period of their own and close at the end of the cutoff date.
                        </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>{field("rental_from", "From")}</Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>{field("rental_to", "To")}</Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>{field("rental_cutoff", "Cutoff date")}</Grid>
                    <Grid size={12}>
                        <FormControlLabel
                            control={<Switch checked={form.data.is_default} onChange={(e) => form.setData("is_default", e.target.checked)} disabled={typeof editing === "object" && editing !== null && editing.is_default} />}
                            label="The default — NATCON opens on this one"
                        />
                    </Grid>
                </Grid>
            </FormDialog>

            <ConfirmDialog
                open={deleting !== null}
                title={`Delete ${deleting?.name ?? "this NATCON"}?`}
                message="Its period, cutoff and threshold go; the sales themselves aren't touched. Its pages stop working."
                confirmLabel="Delete"
                onConfirm={() => {
                    if (deleting) router.delete(`/superadmin/settings/natcon/${deleting.id}`, { preserveScroll: true });
                    setDeleting(null);
                }}
                onClose={() => setDeleting(null)}
            />
        </Container>
    );
}

NatconSettings.layout = (page: ReactNode) => <AppLayout children={page} />;

export default NatconSettings;
