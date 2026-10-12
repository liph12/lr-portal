import { useEffect, useState } from "react";
import { Box, CircularProgress, Drawer, IconButton, Typography } from "@mui/material";
import { CloseRounded, PersonRounded } from "@mui/icons-material";
import { Link, router } from "@inertiajs/react";
import UserAvatar from "./UserAvatar";
import UserStatusChip from "./UserStatusChip";
import DesignationBadges from "./DesignationBadges";
import StyledButton from "../StyledButton";
import PersonDetails, { PersonDetailsData } from "../search/PersonDetails";
import { AgentRow, UserStatus } from "../../../types/app-data-types";

export interface AgentDetail {
    agent_id: number;
    details: PersonDetailsData | null;
    last_active_at: string | null;
}

interface AgentDetailDrawerProps {
    agent: AgentRow | null;
    onClose: () => void;
}

// Management › Agents: a clicked agent's details, the same as the search results show, with the way to their profile.
// Loaded on demand (optional prop `agentDetail`, partial reload) so the table and its URL stay as they are.
export default function AgentDetailDrawer({ agent, onClose }: AgentDetailDrawerProps) {
    const [detail, setDetail] = useState<AgentDetail | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!agent) return;
        setDetail(null);
        setFailed(false);
        router.reload({
            only: ["agentDetail"],
            data: { agent: agent.id },
            preserveUrl: true,
            async: true,
            onSuccess: (page) => setDetail(page.props.agentDetail as AgentDetail),
            onError: () => setFailed(true),
        });
    }, [agent?.id]);

    const open = (path: string) => {
        onClose();
        router.visit(path);
    };

    return (
        <Drawer anchor="right" open={agent !== null} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: "100%", sm: 440 }, backgroundColor: "var(--lr-surface)" } } }}>
            {agent && (
                <Box sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 2 }}>
                        <UserAvatar name={agent.name} src={agent.avatar} size={56} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontSize: 18, fontWeight: 500, color: "var(--lr-text-primary)", wordBreak: "break-word" }}>{agent.name}</Typography>
                            <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", wordBreak: "break-all" }}>
                                {agent.email}
                            </Typography>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", mt: 0.75 }}>
                                <Typography component="span" variant="caption" sx={{ px: 1, py: 0.25, borderRadius: 99, fontWeight: 500, color: "var(--lr-primary)", backgroundColor: "var(--lr-primary-soft)" }}>
                                    {agent.role_label ?? "No role"}
                                </Typography>
                                <DesignationBadges person={agent} />
                                <UserStatusChip status={agent.status as UserStatus} />
                            </Box>
                        </Box>
                        <IconButton aria-label="Close" onClick={onClose}>
                            <CloseRounded />
                        </IconButton>
                    </Box>

                    <Link href={`/agents/${agent.id}`} style={{ textDecoration: "none" }} onClick={onClose}>
                        <StyledButton fullWidth variant="contained" startIcon={<PersonRounded />} sx={{ mb: 2, backgroundColor: "var(--lr-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } }}>
                            View profile
                        </StyledButton>
                    </Link>

                    <Box sx={{ borderRadius: 3, border: "1px solid var(--lr-border)", backgroundColor: "var(--lr-surface-container)" }}>
                        {detail ? (
                            <PersonDetails userId={agent.user_id} agentId={agent.id} details={detail.details} lastActive={detail.last_active_at} onOpen={open} />
                        ) : (
                            <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
                                {failed ? (
                                    <Typography variant="body2" sx={{ color: "var(--lr-error)" }}>
                                        Couldn't load the details. Close and try again.
                                    </Typography>
                                ) : (
                                    <CircularProgress size={22} aria-label="Loading details" />
                                )}
                            </Box>
                        )}
                    </Box>
                </Box>
            )}
        </Drawer>
    );
}
