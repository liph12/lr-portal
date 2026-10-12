import { Box, Typography } from "@mui/material";
import { BlockRounded, CheckCircleRounded, HourglassTopRounded, MoveToInboxRounded } from "@mui/icons-material";
import { Link } from "@inertiajs/react";
import StyledButton from "../utils/StyledButton";
import useCan from "../../hooks/useCan";
import { formatDate, formatDateTime } from "../../helpers/formatDate";
import { SaleDetail } from "./SaleDetailsForm";

// Whether a brokerage or rental sale's commission was received (and signed for), with the way to Brokerage / Rental
// receiving for those who receive that category — that's where it's signed.
export default function CommissionReceipt({ detail }: { detail: SaleDetail }) {
    const can = useCan();
    const p = detail.property;
    const receivedAt = p.received_at ? String(p.received_at) : null;
    const disapproved = !receivedAt && !!p.disapproved_at;

    const tone = receivedAt
        ? { Icon: CheckCircleRounded, color: "var(--lr-success)", bg: "var(--lr-success-soft)" }
        : disapproved
          ? { Icon: BlockRounded, color: "var(--lr-error)", bg: "var(--lr-error-soft)" }
          : { Icon: HourglassTopRounded, color: "var(--lr-warning)", bg: "var(--lr-warning-soft)" };

    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", p: 1.75, borderRadius: 3, backgroundColor: tone.bg }}>
            <tone.Icon sx={{ color: tone.color }} aria-hidden />
            <Box sx={{ flex: "1 1 220px", minWidth: 0 }}>
                <Typography sx={{ fontWeight: 500, color: "var(--lr-text-primary)" }}>
                    {receivedAt ? "Commission received" : disapproved ? "Disapproved at receiving" : "Commission not received yet"}
                </Typography>
                <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                    {receivedAt
                        ? `Signed for by ${detail.names.received_by ?? "—"}, received ${formatDate(receivedAt)} — the sale is valid and the slip is signed.`
                        : disapproved
                          ? `${String(p.disapproval_reason ?? "")} (${formatDateTime(String(p.disapproved_at))})`
                        : `It counts as a valid sale once someone signs for it in ${detail.category === "rental" ? "Rental" : "Brokerage"} receiving.`}
                </Typography>
            </Box>
            {p.received_signature && (
                <Box component="img" src={String(p.received_signature)} alt="Receiver's signature" sx={{ height: 52, maxWidth: 200, objectFit: "contain", p: 0.5, borderRadius: 2, backgroundColor: "var(--lr-paper)" }} />
            )}
            {!receivedAt && !disapproved && can(detail.category === "rental" ? "receive_rental_sales" : "receive_brokerage_sales") && (
                <Link href={`/${detail.category}-receiving?sale=${detail.id}`} style={{ textDecoration: "none" }}>
                    <StyledButton variant="contained" startIcon={<MoveToInboxRounded />} sx={{ backgroundColor: "var(--lr-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } }}>
                        Receive & sign
                    </StyledButton>
                </Link>
            )}
        </Box>
    );
}
