import { ElementType, useState } from "react";
import { Box, Divider, Typography } from "@mui/material";
import { BlockRounded, CheckCircleRounded, DoNotDisturbOnRounded, EditRounded, HourglassTopRounded, UndoRounded } from "@mui/icons-material";
import { router } from "@inertiajs/react";
import StyledButton from "../utils/StyledButton";
import ConfirmDialog from "../utils/ConfirmDialog";
import { statusTone } from "../utils/StatusChip";
import SaleDetailsView from "./SaleDetailsView";
import SaleDetailsForm, { EditOptions, SaleDetail } from "./SaleDetailsForm";
import SaleFiles from "./SaleFiles";
import { SALE_STATUS_CONFIRM, SALE_STATUS_ICONS, SALE_STATUS_SAFE } from "./saleStatusConfirm";
import { formatDate } from "../../helpers/formatDate";

interface SaleReviewProps {
    detail: SaleDetail;
    options: EditOptions | null;
    statusLabels: Record<string, string>;
    // Sales validation's base URL: PATCH {base}/{id} sets the status, PUT edits the details.
    baseUrl: string;
}

// What each button sets, in the order offered (the current status isn't offered).
const ACTIONS: { status: string; label: string; icon: ElementType }[] = [
    { status: "valid", label: "Validate", icon: CheckCircleRounded },
    { status: "invalid", label: "Mark invalid", icon: BlockRounded },
    { status: "cancelled", label: "Cancel sale", icon: DoNotDisturbOnRounded },
    { status: "pending", label: "Back to pending", icon: UndoRounded },
];

// One sale in Sales validation: a colour-coded status banner, the validation buttons (each confirmed), then its details —
// read-only until "Edit details", whose Save never touches the status. Validating and editing are separate on purpose.
export default function SaleReview({ detail, options, statusLabels, baseUrl }: SaleReviewProps) {
    const [editing, setEditing] = useState(false);
    const [asking, setAsking] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const status = detail.sale_status;
    const [bg, fg] = statusTone(status);
    const Icon = SALE_STATUS_ICONS[status] ?? HourglassTopRounded;
    const label = (s: string) => statusLabels[s] ?? s;

    const setStatus = (next: string) => {
        setAsking(null);
        router.patch(`${baseUrl}/${detail.id}`, { status: next }, { preserveScroll: true, preserveState: true, onStart: () => setSaving(true), onFinish: () => setSaving(false) });
    };

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box sx={{ p: 2, borderRadius: 3, backgroundColor: bg, border: `1px solid ${fg}` }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Icon sx={{ fontSize: 32, color: fg }} aria-hidden />
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)", fontWeight: 500, letterSpacing: 0.3 }}>
                            VALIDATION STATUS
                        </Typography>
                        <Typography sx={{ fontSize: 20, fontWeight: 600, color: fg, lineHeight: 1.2 }}>{label(status)}</Typography>
                        <Typography variant="caption" component="p" sx={{ color: "var(--lr-text-body)", mt: 0.25 }}>
                            {status !== "pending" && detail.validated_at
                                ? `Set ${formatDate(detail.validated_at)}${detail.validated_by ? ` by ${detail.validated_by}` : ""}`
                                : status === "pending"
                                  ? "Waiting for validation"
                                  : "Set before this portal"}
                            {` · added ${detail.created_at ? formatDate(detail.created_at) : "—"}${detail.recorded_by ? ` by ${detail.recorded_by}` : ""}`}
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2 }}>
                    {ACTIONS.filter((a) => a.status !== status).map((a) => {
                        const [, tone] = statusTone(a.status);
                        const primary = a.status === "valid";
                        return (
                            <StyledButton
                                key={a.status}
                                size="small"
                                variant={primary ? "contained" : "outlined"}
                                startIcon={<a.icon />}
                                disabled={saving || editing}
                                onClick={() => setAsking(a.status)}
                                sx={
                                    primary
                                        ? { backgroundColor: "var(--lr-success)", color: "var(--lr-on-primary)", ":hover": { backgroundColor: "var(--lr-success)", filter: "brightness(0.95)" } }
                                        : { color: tone, borderColor: tone, backgroundColor: "var(--lr-surface)" }
                                }
                            >
                                {a.label}
                            </StyledButton>
                        );
                    })}
                </Box>
            </Box>

            {editing ? (
                <>
                    <SaleFiles detail={detail} />
                    <Typography sx={{ fontWeight: 500, color: "var(--lr-text-primary)" }}>Edit details</Typography>
                    <SaleDetailsForm key={`${detail.id}-${detail.history.length}`} detail={detail} options={options} baseUrl={baseUrl} onDone={() => setEditing(false)} />
                </>
            ) : (
                <>
                    <Box sx={{ display: "flex", justifyContent: "flex-end", mb: -1.5 }}>
                        <StyledButton size="small" variant="text" startIcon={<EditRounded />} onClick={() => setEditing(true)} sx={{ color: "var(--lr-primary)" }}>
                            Edit details
                        </StyledButton>
                    </Box>
                    <SaleDetailsView detail={detail} showStatus={false} />
                </>
            )}

            {detail.history.length > 0 && (
                <>
                    <Divider />
                    <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: "var(--lr-text-secondary)", mb: 1.5 }}>History</Typography>
                        <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                            {detail.history.map((h, i) => (
                                <Box component="li" key={i}>
                                    <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                                        {h.updated_at ? formatDate(h.updated_at) : ""}
                                        {h.user && ` · ${h.user}`}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: "var(--lr-text-body)", overflowWrap: "anywhere" }}>
                                        {h.description}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </>
            )}

            <ConfirmDialog
                open={asking !== null}
                title={asking ? `${ACTIONS.find((a) => a.status === asking)?.label ?? "Set"} this sale?` : ""}
                message={asking ? `It becomes ${label(asking)}. ${SALE_STATUS_CONFIRM[asking] ?? ""}` : null}
                confirmLabel={asking ? (ACTIONS.find((a) => a.status === asking)?.label ?? `Set to ${label(asking)}`) : ""}
                tone={asking && SALE_STATUS_SAFE.indexOf(asking) !== -1 ? "primary" : "danger"}
                onConfirm={() => asking && setStatus(asking)}
                onClose={() => setAsking(null)}
            />
        </Box>
    );
}
