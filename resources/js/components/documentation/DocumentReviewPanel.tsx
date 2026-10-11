import { FormEvent } from "react";
import {
    Box,
    Checkbox,
    Divider,
    Drawer,
    FormControlLabel,
    IconButton,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from "@mui/material";
import { CloseRounded, OpenInNewRounded, SendRounded } from "@mui/icons-material";
import { Link, useForm } from "@inertiajs/react";
import StatusChip from "../utils/StatusChip";
import StyledButton from "../utils/StyledButton";
import UserAvatar from "../utils/user/UserAvatar";
import { formatDate } from "../../helpers/formatDate";
import { DOCUMENT_STATUS_LABELS, DOCUMENT_TYPE_LABELS, isImageFile } from "./documentLabels";

export interface DocumentDetail {
    id: number;
    type: string;
    file_url: string;
    file_name: string | null;
    status: string;
    is_current: boolean;
    remarks: string | null;
    created_at: string | null;
    reviewed_at: string | null;
    reviewer: string | null;
    agent: { id: number; name: string; email: string | null; avatar: string | null; status: string | null };
    history: { id: number; file_url: string; file_name: string | null; status: string; is_current: boolean; created_at: string | null }[];
    comments: { id: number; body: string; author: string; avatar: string | null; created_at: string | null }[];
}

interface DocumentReviewPanelProps {
    document: DocumentDetail | null;
    baseUrl: string;
    statuses: string[];
    onClose: () => void;
    onOpen: (id: number) => void;
}

const sectionTitle = { fontSize: 13, fontWeight: 600, color: "var(--lr-text-secondary)", mb: 1 };

// Right-hand drawer: the file, the review (status, remarks, latest flag), older uploads and reviewers' comments.
export default function DocumentReviewPanel({ document: doc, baseUrl, statuses, onClose, onOpen }: DocumentReviewPanelProps) {
    return (
        <Drawer
            anchor="right"
            open={doc !== null}
            onClose={onClose}
            slotProps={{ paper: { sx: { width: { xs: "100%", sm: 520 }, backgroundColor: "var(--lr-surface)" } } }}
        >
            {doc && <PanelBody key={doc.id} doc={doc} baseUrl={baseUrl} statuses={statuses} onClose={onClose} onOpen={onOpen} />}
        </Drawer>
    );
}

function PanelBody({ doc, baseUrl, statuses, onClose, onOpen }: { doc: DocumentDetail } & Omit<DocumentReviewPanelProps, "document">) {
    const review = useForm({ status: doc.status, remarks: doc.remarks ?? "", is_current: doc.is_current });
    const comment = useForm({ body: "" });

    const saveReview = (e: FormEvent) => {
        e.preventDefault();
        review.patch(`${baseUrl}/${doc.id}`, { preserveScroll: true, preserveState: true });
    };

    const addComment = (e: FormEvent) => {
        e.preventDefault();
        comment.post(`${baseUrl}/${doc.id}/comments`, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => comment.reset(),
        });
    };

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <UserAvatar name={doc.agent.name} src={doc.agent.avatar} size={44} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/agents/${doc.agent.id}`} style={{ textDecoration: "none" }}>
                        <Typography sx={{ fontWeight: 500, color: "var(--lr-primary)" }} noWrap>
                            {doc.agent.name}
                        </Typography>
                    </Link>
                    <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }} noWrap component="div">
                        {doc.agent.email ?? `Agent #${doc.agent.id}`}
                    </Typography>
                </Box>
                <IconButton aria-label="Close" onClick={onClose}>
                    <CloseRounded />
                </IconButton>
            </Box>

            <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 1 }}>
                    <Typography variant="h6" sx={{ fontSize: 18, color: "var(--lr-text-primary)" }}>
                        {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}
                    </Typography>
                    <StatusChip status={doc.status}>{DOCUMENT_STATUS_LABELS[doc.status] ?? doc.status}</StatusChip>
                    {doc.is_current ? <StatusChip status="active">Latest</StatusChip> : <StatusChip status="inactive">Older upload</StatusChip>}
                </Box>
                <Typography variant="caption" component="div" sx={{ color: "var(--lr-text-secondary)" }}>
                    Uploaded {doc.created_at ? formatDate(doc.created_at) : "—"}
                    {doc.reviewed_at && ` · reviewed ${formatDate(doc.reviewed_at)}${doc.reviewer ? ` by ${doc.reviewer}` : ""}`}
                </Typography>
            </Box>

            <Box sx={{ border: "1px solid var(--lr-border)", borderRadius: 3, overflow: "hidden", backgroundColor: "var(--lr-surface-dim)" }}>
                {isImageFile(doc.file_url) && (
                    <Box component="a" href={doc.file_url} target="_blank" rel="noopener noreferrer" sx={{ display: "block" }}>
                        <Box component="img" src={doc.file_url} alt={`${DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type} of ${doc.agent.name}`} sx={{ width: "100%", maxHeight: 360, objectFit: "contain", display: "block" }} />
                    </Box>
                )}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1.5 }}>
                    <Typography variant="body2" noWrap sx={{ flex: 1, color: "var(--lr-text-body)" }}>
                        {doc.file_name ?? "Document"}
                    </Typography>
                    <StyledButton size="small" variant="text" endIcon={<OpenInNewRounded fontSize="small" />} href={doc.file_url} target="_blank" rel="noopener noreferrer" sx={{ color: "var(--lr-primary)" }}>
                        Open file
                    </StyledButton>
                </Box>
            </Box>

            <Box component="form" onSubmit={saveReview} sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Typography sx={sectionTitle}>Review</Typography>
                <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={review.data.status}
                    onChange={(_, v) => v && review.setData("status", v)}
                    aria-label="Document status"
                    sx={{ flexWrap: "wrap", "& .MuiToggleButton-root": { textTransform: "none", px: 2, borderColor: "var(--lr-border)", color: "var(--lr-text-body)" }, "& .Mui-selected": { color: "var(--lr-primary) !important", backgroundColor: "var(--lr-primary-soft) !important" } }}
                >
                    {statuses.map((s) => (
                        <ToggleButton key={s} value={s}>
                            {DOCUMENT_STATUS_LABELS[s] ?? s}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
                <TextField
                    label="Remarks for the agent"
                    multiline
                    minRows={3}
                    value={review.data.remarks}
                    onChange={(e) => review.setData("remarks", e.target.value)}
                    error={!!review.errors.remarks}
                    helperText={review.errors.remarks ?? (review.data.status === "for_reupload" ? "Required: say what to fix." : " ")}
                    slotProps={{ htmlInput: { maxLength: 2000 } }}
                />
                {!doc.is_current && (
                    <FormControlLabel
                        control={<Checkbox checked={review.data.is_current} onChange={(e) => review.setData("is_current", e.target.checked)} />}
                        label={<Typography variant="body2">Make this the latest {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}</Typography>}
                    />
                )}
                <Box>
                    <StyledButton type="submit" variant="contained" disabled={review.processing || !review.isDirty}>
                        {review.processing ? "Saving…" : "Save review"}
                    </StyledButton>
                </Box>
            </Box>

            <Divider />

            <Box>
                <Typography sx={sectionTitle}>Comments</Typography>
                {doc.comments.length === 0 && (
                    <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", mb: 1.5 }}>
                        No comments yet. Notes here are for reviewers only.
                    </Typography>
                )}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 1.5 }}>
                    {doc.comments.map((c) => (
                        <Box key={c.id} sx={{ display: "flex", gap: 1.25 }}>
                            <UserAvatar name={c.author} src={c.avatar} size={28} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                                    <Box component="span" sx={{ fontWeight: 600, color: "var(--lr-text-primary)" }}>
                                        {c.author}
                                    </Box>
                                    {c.created_at && ` · ${formatDate(c.created_at)}`}
                                </Typography>
                                <Typography variant="body2" sx={{ color: "var(--lr-text-body)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                                    {c.body}
                                </Typography>
                            </Box>
                        </Box>
                    ))}
                </Box>
                <Box component="form" onSubmit={addComment} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                    <TextField
                        size="small"
                        fullWidth
                        multiline
                        maxRows={4}
                        placeholder="Add a comment"
                        value={comment.data.body}
                        onChange={(e) => comment.setData("body", e.target.value)}
                        error={!!comment.errors.body}
                        helperText={comment.errors.body}
                        slotProps={{ htmlInput: { maxLength: 2000, "aria-label": "Comment" } }}
                    />
                    <IconButton type="submit" aria-label="Post comment" disabled={comment.processing || !comment.data.body.trim()} sx={{ color: "var(--lr-primary)" }}>
                        <SendRounded />
                    </IconButton>
                </Box>
            </Box>

            {doc.history.length > 0 && (
                <>
                    <Divider />
                    <Box>
                        <Typography sx={sectionTitle}>Other uploads of this {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}</Typography>
                        {doc.history.map((h) => (
                            <Box
                                key={h.id}
                                onClick={() => onOpen(h.id)}
                                sx={{ display: "flex", alignItems: "center", gap: 1, py: 1, px: 1, mx: -1, borderRadius: 2, cursor: "pointer", ":hover": { backgroundColor: "var(--lr-surface-hover)" } }}
                            >
                                <Typography variant="body2" noWrap sx={{ flex: 1, color: "var(--lr-text-body)" }}>
                                    {h.file_name ?? "Document"}
                                    <Typography component="span" variant="caption" sx={{ color: "var(--lr-text-secondary)", ml: 1 }}>
                                        {h.created_at ? formatDate(h.created_at) : ""}
                                    </Typography>
                                </Typography>
                                {h.is_current && <StatusChip status="active">Latest</StatusChip>}
                                <StatusChip status={h.status}>{DOCUMENT_STATUS_LABELS[h.status] ?? h.status}</StatusChip>
                            </Box>
                        ))}
                    </Box>
                </>
            )}
        </Box>
    );
}
