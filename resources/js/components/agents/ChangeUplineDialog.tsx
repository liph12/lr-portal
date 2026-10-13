import { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { router, useForm } from "@inertiajs/react";
import FormDialog from "../utils/forms/FormDialog";
import FieldLabel from "../utils/forms/FieldLabel";
import AgentPicker from "../utils/forms/AgentPicker";
import StyledTextField from "../utils/StyledTextField";
import { AgentOption } from "../../types/app-data-types";

export interface UplinePlacement {
    upline_id: number;
    team: string | null;
    sub_team: string | null;
}

interface ChangeUplineDialogProps {
    open: boolean;
    agentId: number;
    agentName: string;
    // Answer to ?upline_preview= (optional prop uplinePlacement).
    placement: UplinePlacement | null | undefined;
    onClose: () => void;
}

const today = () => new Date().toLocaleDateString("en-CA");

// New upline → the agent moves to the upline's team and sub-team (just the team when the upline has none there), from the
// chosen date, keeping the history.
export default function ChangeUplineDialog({ open, agentId, agentName, placement, onClose }: ChangeUplineDialogProps) {
    const [upline, setUpline] = useState<AgentOption | null>(null);
    const [previewing, setPreviewing] = useState(false);
    const form = useForm<{ upline_id: number | null; date: string }>({ upline_id: null, date: today() });

    useEffect(() => {
        if (open) {
            setUpline(null);
            form.setData({ upline_id: null, date: today() });
            form.clearErrors();
        }
    }, [open]);

    const pick = (agent: AgentOption | null) => {
        setUpline(agent);
        form.setData("upline_id", agent?.id ?? null);
        form.clearErrors("upline_id");
        if (!agent) return;
        router.reload({
            only: ["uplinePlacement"],
            data: { upline_preview: agent.id },
            preserveUrl: true,
            async: true,
            onStart: () => setPreviewing(true),
            onFinish: () => setPreviewing(false),
        });
    };

    const shown = upline && placement?.upline_id === upline.id ? placement : null;
    const first = agentName.split(" ")[0];

    return (
        <FormDialog
            open={open}
            title={`Change ${first}'s upline`}
            submitLabel="Change upline"
            processing={form.processing}
            onClose={onClose}
            onSubmit={() => form.put(`/agents/${agentId}/upline`, { preserveScroll: true, onSuccess: onClose })}
        >
            <div>
                <FieldLabel text="New upline" required />
                <AgentPicker name="upline_id" value={upline} onChange={pick} error={form.errors.upline_id ?? null} exclude={agentId} />
            </div>
            <div>
                <FieldLabel text="Moves on" required />
                <StyledTextField
                    type="date"
                    name="date"
                    value={form.data.date}
                    error={form.errors.date ?? null}
                    handleChange={(e) => form.setData("date", e.target.value)}
                    props={{ slotProps: { htmlInput: { max: today() } } }}
                />
            </div>
            <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: "var(--lr-surface-container)", minHeight: 48, display: "flex", alignItems: "center", gap: 1 }}>
                {!upline ? (
                    <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                        {first} moves to the new upline's team and sub-team. Their team history is kept.
                    </Typography>
                ) : previewing || !shown ? (
                    <>
                        <CircularProgress size={16} sx={{ color: "var(--lr-primary)" }} />
                        <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                            Checking {upline.name}'s team…
                        </Typography>
                    </>
                ) : shown.team ? (
                    <Typography variant="body2" sx={{ color: "var(--lr-text-primary)" }}>
                        {first} moves to <strong>{shown.team}</strong>
                        {shown.sub_team ? (
                            <>
                                {" "}/ <strong>{shown.sub_team}</strong>
                            </>
                        ) : (
                            " (the team only — the upline has no sub-team there)"
                        )}
                        .
                    </Typography>
                ) : (
                    <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                        {upline.name} isn't on a team, so {first}'s team stays as it is; only the upline changes.
                    </Typography>
                )}
            </Box>
        </FormDialog>
    );
}
