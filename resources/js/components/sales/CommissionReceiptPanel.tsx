import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { BlockRounded, EditCalendarRounded, HowToRegRounded } from "@mui/icons-material";
import { useForm } from "@inertiajs/react";
import StyledButton from "../utils/StyledButton";
import StyledTextField from "../utils/StyledTextField";
import FieldLabel from "../utils/forms/FieldLabel";
import FormDialog from "../utils/forms/FormDialog";
import SignaturePad from "../utils/forms/SignaturePad";
import { formatDate, formatDateTime } from "../../helpers/formatDate";
import { SaleDetail } from "./SaleDetailsForm";

interface CommissionReceiptPanelProps {
    detail: SaleDetail;
    // The receiving page's base URL (/brokerage-receiving or /rental-receiving).
    base: string;
}

const today = () => new Date().toLocaleDateString("en-CA");
const dateOnly = (value: unknown) => (value ? String(value).slice(0, 10) : "");

// The slip's receipt at Brokerage / Rental receiving: waiting — sign for it on a chosen date, or disapprove it with a
// reason; received — the signature, with the date still correctable; disapproved — who, when and why.
export default function CommissionReceiptPanel({ detail, base }: CommissionReceiptPanelProps) {
    const p = detail.property;
    const receivedAt = p.received_at ? String(p.received_at) : null;
    const disapproved = detail.sale_status === "invalid";
    const receive = useForm<{ signature: string | null; received_on: string }>({ signature: null, received_on: today() });
    const redate = useForm<{ received_on: string }>({ received_on: dateOnly(receivedAt) });
    const disapprove = useForm<{ reason: string }>({ reason: "" });
    const [disapproving, setDisapproving] = useState(false);
    const keep = { preserveScroll: true, preserveState: true };

    return (
        <Box sx={{ p: 2, borderRadius: 3, border: "1px solid var(--lr-border)" }}>
            <Typography sx={{ fontWeight: 500, color: "var(--lr-text-primary)", mb: 1.5 }}>
                {receivedAt ? "Received" : disapproved ? "Disapproved" : "Receive this commission"}
            </Typography>

            {receivedAt && (
                <>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
                        {p.received_signature && (
                            <Box
                                component="img"
                                src={String(p.received_signature)}
                                alt={`Signature of ${detail.names.received_by ?? "the receiver"}`}
                                sx={{ height: 72, maxWidth: 260, objectFit: "contain", p: 0.5, borderRadius: 2, backgroundColor: "var(--lr-paper)" }}
                            />
                        )}
                        <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                            Signed by <strong>{detail.names.received_by ?? "—"}</strong>, received {formatDate(receivedAt)}. The sale is valid.
                        </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1.5, flexWrap: "wrap" }}>
                        <Box sx={{ flex: "1 1 180px" }}>
                            <FieldLabel text="Date received" />
                            <StyledTextField
                                type="date"
                                name="received_on"
                                value={redate.data.received_on}
                                error={redate.errors.received_on ?? null}
                                handleChange={(e) => redate.setData("received_on", e.target.value)}
                                props={{ slotProps: { htmlInput: { max: today() } } }}
                            />
                        </Box>
                        <StyledButton
                            variant="outlined"
                            startIcon={<EditCalendarRounded />}
                            disabled={redate.processing || redate.data.received_on === dateOnly(receivedAt)}
                            onClick={() => redate.patch(`${base}/${detail.id}/received-date`, keep)}
                            sx={{ mb: 0.5, color: "var(--lr-primary)", borderColor: "var(--lr-outline)" }}
                        >
                            Change date
                        </StyledButton>
                    </Box>
                </>
            )}

            {!receivedAt && disapproved && (
                <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: "var(--lr-error-soft)" }}>
                    <Typography variant="body2" sx={{ color: "var(--lr-text-primary)" }}>
                        {p.disapproval_reason ? String(p.disapproval_reason) : "Marked invalid in Sales validation."}
                    </Typography>
                    {p.disapproved_at && (
                        <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                            Disapproved {formatDateTime(String(p.disapproved_at))}
                        </Typography>
                    )}
                </Box>
            )}

            {!receivedAt && !disapproved && (
                <>
                    <Box sx={{ maxWidth: 240, mb: 1.5 }}>
                        <FieldLabel text="Date received" required />
                        <StyledTextField
                            type="date"
                            name="received_on"
                            value={receive.data.received_on}
                            error={receive.errors.received_on ?? null}
                            handleChange={(e) => receive.setData("received_on", e.target.value)}
                            props={{ slotProps: { htmlInput: { max: today() } } }}
                        />
                    </Box>
                    <SignaturePad onChange={(signature) => receive.setData("signature", signature)} error={receive.errors.signature ?? null} disabled={receive.processing} />
                    <Box sx={{ display: "flex", gap: 1.5, mt: 2, flexWrap: "wrap" }}>
                        <StyledButton
                            variant="outlined"
                            startIcon={<BlockRounded />}
                            onClick={() => setDisapproving(true)}
                            sx={{ color: "var(--lr-error)", borderColor: "var(--lr-outline)" }}
                        >
                            Disapprove
                        </StyledButton>
                        <StyledButton
                            variant="contained"
                            startIcon={<HowToRegRounded />}
                            disabled={!receive.data.signature || receive.processing}
                            onClick={() => receive.post(`${base}/${detail.id}/receive`, { ...keep, onSuccess: () => receive.reset() })}
                            sx={{ flex: 1, backgroundColor: "var(--lr-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } }}
                        >
                            Sign & receive
                        </StyledButton>
                    </Box>
                    <FormDialog
                        open={disapproving}
                        title="Disapprove this sale?"
                        submitLabel="Disapprove"
                        processing={disapprove.processing}
                        onClose={() => setDisapproving(false)}
                        onSubmit={() => disapprove.post(`${base}/${detail.id}/disapprove`, { ...keep, onSuccess: () => setDisapproving(false) })}
                    >
                        <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                            The sale is marked invalid and the slip is stamped Disapproved with your reason.
                        </Typography>
                        <div>
                            <FieldLabel text="Reason" required />
                            <StyledTextField
                                name="reason"
                                value={disapprove.data.reason}
                                error={disapprove.errors.reason ?? null}
                                handleChange={(e) => disapprove.setData("reason", e.target.value)}
                                props={{ multiline: true, rows: 3, slotProps: { htmlInput: { maxLength: 500 } } }}
                            />
                        </div>
                    </FormDialog>
                </>
            )}
        </Box>
    );
}
