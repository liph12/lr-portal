import { useEffect } from "react";
import { useForm } from "@inertiajs/react";
import FormDialog from "./FormDialog";
import FieldLabel from "./FieldLabel";
import StyledTextField from "../StyledTextField";

export interface SalesCutoffRow {
    id: number;
    month: string;
    // "YYYY-MM-DDTHH:mm", ready for a datetime-local input.
    cutoff_at: string;
    closed: boolean;
}

interface SalesCutoffDialogProps {
    open: boolean;
    cutoff: SalesCutoffRow | null;
    onClose: () => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

// New cutoffs default to this month, closing on the 2nd of next month at 5:00 PM (the usual schedule).
function defaults(): { month: string; cutoff_at: string } {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 2);
    return {
        month: `${now.getFullYear()}-${pad(now.getMonth() + 1)}`,
        cutoff_at: `${next.getFullYear()}-${pad(next.getMonth() + 1)}-02T17:00`,
    };
}

export default function SalesCutoffDialog({ open, cutoff, onClose }: SalesCutoffDialogProps) {
    const form = useForm(defaults());

    useEffect(() => {
        if (!open) return;
        form.setData(cutoff ? { month: cutoff.month, cutoff_at: cutoff.cutoff_at } : defaults());
        form.clearErrors();
    }, [open, cutoff?.id]);

    const submit = () => {
        const options = { preserveScroll: true, onSuccess: onClose };
        cutoff ? form.put(`/superadmin/settings/sales-cutoffs/${cutoff.id}`, options) : form.post("/superadmin/settings/sales-cutoffs", options);
    };

    return (
        <FormDialog
            open={open}
            title={cutoff ? "Edit sales cutoff" : "New sales cutoff"}
            submitLabel={cutoff ? "Save" : "Add cutoff"}
            processing={form.processing}
            onSubmit={submit}
            onClose={onClose}
        >
            <div>
                <FieldLabel text="Sales month" required />
                <StyledTextField type="month" name="month" value={form.data.month} error={form.errors.month ?? null} handleChange={(e) => form.setData("month", e.target.value)} />
            </div>
            <div>
                <FieldLabel text="Closes on (date and time)" required />
                <StyledTextField
                    type="datetime-local"
                    name="cutoff_at"
                    value={form.data.cutoff_at}
                    error={form.errors.cutoff_at ?? null}
                    handleChange={(e) => form.setData("cutoff_at", e.target.value)}
                    props={{ helperText: "From this moment, sales reserved in that month (or earlier) can't be recorded." }}
                />
            </div>
        </FormDialog>
    );
}
