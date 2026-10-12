import { ReactNode } from "react";
import { Box, Container, Grid, Typography } from "@mui/material";
import { SaveRounded } from "@mui/icons-material";
import { useForm } from "@inertiajs/react";
import AppLayout from "../../../../components/layouts/AppLayout";
import SectionTitle from "../../../../components/utils/SectionTitle";
import SectionCard from "../../../../components/cards/SectionCard";
import StyledButton from "../../../../components/utils/StyledButton";
import StyledTextField from "../../../../components/utils/StyledTextField";
import FieldLabel from "../../../../components/utils/forms/FieldLabel";
import { formatDate, formatDateTime } from "../../../../helpers/formatDate";
import { formatMonthYear } from "../../../../helpers/salesCutoff";
import { NatconSettings as Settings } from "../../../../components/natcon/NatconPeriod";

interface NatconSettingsProps {
    settings: Settings;
    cutoffs: { month: string; cutoff_at: string }[];
}

// Settings › NATCON: the convention period, the month whose cutoff closes it, how much an agent must sell to qualify, and
// Top Rent Managers' own period and cutoff date.
function NatconSettings({ settings, cutoffs }: NatconSettingsProps) {
    const form = useForm({
        from: settings.from,
        to: settings.to,
        cutoff_month: settings.cutoff_month,
        qualifier_amount: String(settings.qualifier_amount),
        rental_from: settings.rental_from,
        rental_to: settings.rental_to,
        rental_cutoff: settings.rental_cutoff,
    });
    const cutoff = cutoffs.find((c) => c.month === form.data.cutoff_month)?.cutoff_at ?? null;

    const save = () => {
        form.transform((d) => ({
            ...d,
            qualifier_amount: d.qualifier_amount.replace(/,/g, "").trim(),
        }));
        form.put("/superadmin/settings/natcon", { preserveScroll: true });
    };

    return (
        <Container maxWidth="md" sx={{ py: { xs: 3, sm: 4 } }}>
            <SectionTitle title="NATCON" subtitle="The period, cutoff and qualifier amount behind the NATCON rankings." />
            <SectionCard title="NATCON period">
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <FieldLabel text="From (reservation date)" required />
                        <StyledTextField
                            type="date"
                            name="from"
                            value={form.data.from}
                            error={form.errors.from ?? null}
                            handleChange={(e) => form.setData("from", e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <FieldLabel text="To (reservation date)" required />
                        <StyledTextField type="date" name="to" value={form.data.to} error={form.errors.to ?? null} handleChange={(e) => form.setData("to", e.target.value)} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <FieldLabel text="Cutoff month" required />
                        <StyledTextField
                            type="month"
                            name="cutoff_month"
                            value={form.data.cutoff_month}
                            error={form.errors.cutoff_month ?? null}
                            handleChange={(e) => form.setData("cutoff_month", e.target.value)}
                        />
                        <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                            {cutoff
                                ? `Sales encoded after ${formatDateTime(cutoff)} (the ${formatMonthYear(form.data.cutoff_month)} cutoff) don't count.`
                                : `${form.data.cutoff_month ? formatMonthYear(form.data.cutoff_month) : "This month"} has no cutoff yet (Settings › Sales cutoff) — until it does, every sale encoded so far counts.`}
                        </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <FieldLabel text="Qualifier amount (valid sales, ₱)" required />
                        <StyledTextField
                            name="qualifier_amount"
                            value={form.data.qualifier_amount}
                            error={form.errors.qualifier_amount ?? null}
                            handleChange={(e) => form.setData("qualifier_amount", e.target.value)}
                            props={{
                                slotProps: {
                                    htmlInput: {
                                        inputMode: "decimal" as const,
                                    },
                                },
                            }}
                        />
                        <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                            Agents whose project, brokerage and rental sales together reach this qualify.
                        </Typography>
                    </Grid>
                </Grid>
            </SectionCard>
            <Box sx={{ mt: 2 }}>
                <SectionCard title="Top Rent Managers" subtitle="Rentals run on a period and cutoff date of their own.">
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <FieldLabel text="From (reservation date)" required />
                            <StyledTextField
                                type="date"
                                name="rental_from"
                                value={form.data.rental_from}
                                error={form.errors.rental_from ?? null}
                                handleChange={(e) => form.setData("rental_from", e.target.value)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <FieldLabel text="To (reservation date)" required />
                            <StyledTextField
                                type="date"
                                name="rental_to"
                                value={form.data.rental_to}
                                error={form.errors.rental_to ?? null}
                                handleChange={(e) => form.setData("rental_to", e.target.value)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <FieldLabel text="Cutoff (date encoded)" required />
                            <StyledTextField
                                type="date"
                                name="rental_cutoff"
                                value={form.data.rental_cutoff}
                                error={form.errors.rental_cutoff ?? null}
                                handleChange={(e) => form.setData("rental_cutoff", e.target.value)}
                            />
                        </Grid>
                        <Grid size={12}>
                            <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                                {form.data.rental_cutoff
                                    ? `Rental sales encoded after the end of ${formatDate(form.data.rental_cutoff)} don't count.`
                                    : "Choose the last day sales may be encoded."}
                            </Typography>
                        </Grid>
                    </Grid>
                </SectionCard>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                <StyledButton
                    variant="contained"
                    startIcon={<SaveRounded />}
                    disabled={form.processing || !form.isDirty}
                    onClick={save}
                    sx={{
                        backgroundColor: "var(--lr-primary)",
                        ":hover": {
                            backgroundColor: "var(--lr-primary-hover)",
                        },
                    }}
                >
                    Save
                </StyledButton>
            </Box>
        </Container>
    );
}

NatconSettings.layout = (page: ReactNode) => <AppLayout children={page} />;

export default NatconSettings;
