import { ReactNode, useState } from "react";
import { Box, Container, IconButton, Switch, Tooltip, Typography } from "@mui/material";
import { AddRounded, ArrowDownwardRounded, ArrowUpwardRounded, DeleteOutlineRounded, EditOutlined, LinkRounded } from "@mui/icons-material";
import { router } from "@inertiajs/react";
import AppLayout from "../../../../components/layouts/AppLayout";
import SectionTitle from "../../../../components/utils/SectionTitle";
import StyledButton from "../../../../components/utils/StyledButton";
import StatusChip from "../../../../components/utils/StatusChip";
import ConfirmDialog from "../../../../components/utils/ConfirmDialog";
import PosterDialog from "../../../../components/utils/forms/PosterDialog";
import { formatDate } from "../../../../helpers/formatDate";
import { ManagedPoster } from "../../../../types/app-data-types";

interface PostersProps {
    posters: ManagedPoster[];
    maxImageKb: number;
}

const BASE = "/superadmin/settings/posters";
const STATES: Record<ManagedPoster["state"], { label: string; tone: string }> = {
    showing: { label: "Showing", tone: "valid" },
    scheduled: { label: "Scheduled", tone: "pending" },
    ended: { label: "Ended", tone: "inactive" },
    hidden: { label: "Hidden", tone: "inactive" },
};

function dates(p: ManagedPoster): string {
    if (p.starts_on && p.ends_on) return `${formatDate(p.starts_on)} – ${formatDate(p.ends_on)}`;
    if (p.starts_on) return `From ${formatDate(p.starts_on)}`;
    if (p.ends_on) return `Until ${formatDate(p.ends_on)}`;
    return "No end date";
}

// Settings › Dashboard posters: the announcements in the dashboard's carousel, in the order shown.
function Posters({ posters, maxImageKb }: PostersProps) {
    const [editing, setEditing] = useState<ManagedPoster | null>(null);
    const [adding, setAdding] = useState(false);
    const [deleting, setDeleting] = useState<ManagedPoster | null>(null);

    const move = (index: number, step: number) => {
        const ids = posters.map((p) => p.id);
        [ids[index], ids[index + step]] = [ids[index + step], ids[index]];
        router.put(`${BASE}/order`, { ids }, { preserveScroll: true });
    };

    return (
        <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4 } }}>
            <SectionTitle
                title="Dashboard posters"
                subtitle="Announcements everyone sees beside the welcome on the dashboard. More than one turns into a carousel, in this order."
                action={
                    <StyledButton
                        variant="contained"
                        startIcon={<AddRounded />}
                        onClick={() => setAdding(true)}
                        sx={{ flexShrink: 0, backgroundColor: "var(--lr-primary)", color: "var(--lr-on-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } }}
                    >
                        Add poster
                    </StyledButton>
                }
            />

            {posters.length === 0 ? (
                <Box sx={{ p: 4, textAlign: "center", borderRadius: 3, border: "1px dashed var(--lr-outline)", color: "var(--lr-text-secondary)" }}>
                    <Typography variant="body2">No posters yet. The dashboard shows just the welcome until you add one.</Typography>
                </Box>
            ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    {posters.map((p, i) => (
                        <Box
                            key={p.id}
                            sx={{
                                display: "flex",
                                flexDirection: { xs: "column", sm: "row" },
                                alignItems: { sm: "center" },
                                gap: 2,
                                p: 1.5,
                                borderRadius: 3,
                                border: "1px solid var(--lr-border)",
                                backgroundColor: "var(--lr-surface)",
                                opacity: p.state === "showing" ? 1 : 0.75,
                            }}
                        >
                            <Box component="img" src={p.image_url} alt={p.title} sx={{ width: { xs: "100%", sm: 210 }, aspectRatio: "1200 / 515", objectFit: "cover", borderRadius: 2, flexShrink: 0, backgroundColor: "var(--lr-video-bg)" }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                    <Typography sx={{ fontWeight: 600, color: "var(--lr-text-primary)" }}>{p.title}</Typography>
                                    <StatusChip status={STATES[p.state].tone}>{STATES[p.state].label}</StatusChip>
                                </Box>
                                <Typography variant="body2" sx={{ mt: 0.5, color: "var(--lr-text-secondary)" }}>
                                    {dates(p)}
                                </Typography>
                                {p.link_url && (
                                    <Typography variant="caption" sx={{ mt: 0.25, display: "inline-flex", alignItems: "center", gap: 0.5, color: "var(--lr-text-secondary)", wordBreak: "break-all" }}>
                                        <LinkRounded sx={{ fontSize: 15 }} /> {p.link_url}
                                    </Typography>
                                )}
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, flexShrink: 0 }}>
                                <Tooltip title={p.is_active ? "Showing — switch off to hide" : "Hidden — switch on to show"}>
                                    <Switch
                                        checked={p.is_active}
                                        onChange={(e) => router.patch(`${BASE}/${p.id}/active`, { is_active: e.target.checked }, { preserveScroll: true })}
                                        slotProps={{ input: { "aria-label": `Show ${p.title}` } }}
                                    />
                                </Tooltip>
                                <Tooltip title="Move up">
                                    <span>
                                        <IconButton size="small" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${p.title} up`}>
                                            <ArrowUpwardRounded fontSize="small" />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip title="Move down">
                                    <span>
                                        <IconButton size="small" disabled={i === posters.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${p.title} down`}>
                                            <ArrowDownwardRounded fontSize="small" />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip title="Edit">
                                    <IconButton size="small" onClick={() => setEditing(p)} aria-label={`Edit ${p.title}`} sx={{ color: "var(--lr-primary)" }}>
                                        <EditOutlined fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                    <IconButton size="small" onClick={() => setDeleting(p)} aria-label={`Delete ${p.title}`} sx={{ color: "var(--lr-error)" }}>
                                        <DeleteOutlineRounded fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>
                    ))}
                </Box>
            )}

            <PosterDialog open={adding || editing !== null} poster={editing} maxImageKb={maxImageKb} onClose={() => (setAdding(false), setEditing(null))} />
            <ConfirmDialog
                open={deleting !== null}
                title={`Delete "${deleting?.title ?? ""}"?`}
                message="It disappears from everyone's dashboard. To take it down for a while instead, switch it off."
                confirmLabel="Delete"
                onConfirm={() => {
                    if (deleting) router.delete(`${BASE}/${deleting.id}`, { preserveScroll: true });
                    setDeleting(null);
                }}
                onClose={() => setDeleting(null)}
            />
        </Container>
    );
}

Posters.layout = (page: ReactNode) => <AppLayout children={page} />;

export default Posters;
