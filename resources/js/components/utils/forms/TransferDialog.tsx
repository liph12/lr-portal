import { useEffect, useMemo } from "react";
import { MenuItem, Typography } from "@mui/material";
import { useForm } from "@inertiajs/react";
import FormDialog from "./FormDialog";
import FieldLabel from "./FieldLabel";
import AgentPicker from "./AgentPicker";
import StyledTextField from "../StyledTextField";
import { AgentOption, TeamOption } from "../../../types/app-data-types";

interface TransferDialogProps {
    open: boolean;
    // Preselected agent (from the Agents list); null lets you search for one.
    agent: (AgentOption & { team_name?: string | null; sub_team_name?: string | null }) | null;
    teams: TeamOption[];
    baseUrl: string;
    onClose: () => void;
}

interface TransferForm {
    agent: AgentOption | null;
    team_id: number | "";
    sub_team_id: number | "";
    date: string;
}

const today = () => new Date().toLocaleDateString("en-CA");

export default function TransferDialog({ open, agent, teams, baseUrl, onClose }: TransferDialogProps) {
    const form = useForm<TransferForm>({ agent: null, team_id: "", sub_team_id: "", date: today() });
    const errors = form.errors as Record<string, string>;
    const activeTeams = useMemo(() => teams.filter((t) => t.status === "active"), [teams]);
    const subTeams = activeTeams.find((t) => t.id === form.data.team_id)?.sub_teams ?? [];

    useEffect(() => {
        if (!open) return;
        form.setData({ agent, team_id: "", sub_team_id: "", date: today() });
        form.clearErrors();
    }, [open, agent?.id]);

    const submit = () => {
        if (!form.data.agent) {
            form.setError("agent", "Pick the agent to move.");
            return;
        }
        form.transform((d) => ({ team_id: d.team_id, sub_team_id: d.sub_team_id, date: d.date }));
        form.post(`${baseUrl}/agents/${form.data.agent.id}/transfer`, { preserveScroll: true, onSuccess: onClose });
    };

    return (
        <FormDialog open={open} title="Transfer agent" submitLabel="Transfer" processing={form.processing} onSubmit={submit} onClose={onClose}>
            <div>
                <FieldLabel text="Agent" required />
                {agent ? (
                    <Typography variant="body2" sx={{ color: "var(--lr-text-primary)", ml: 0.5 }}>
                        {agent.name}
                        <Typography component="span" variant="caption" sx={{ color: "var(--lr-text-secondary)", display: "block" }}>
                            Now on {agent.team_name ?? "no team"}
                            {agent.sub_team_name ? ` / ${agent.sub_team_name}` : ""}
                        </Typography>
                    </Typography>
                ) : (
                    <AgentPicker name="agent" value={form.data.agent} onChange={(a) => form.setData("agent", a)} error={errors.agent ?? null} />
                )}
            </div>
            <div>
                <FieldLabel text="Move to team" required />
                <StyledTextField
                    name="team_id"
                    value={String(form.data.team_id)}
                    error={errors.team_id ?? null}
                    handleChange={(e) => form.setData((d) => ({ ...d, team_id: Number(e.target.value), sub_team_id: "" }))}
                    props={{
                        select: true,
                        children: activeTeams.map((t) => (
                            <MenuItem key={t.id} value={String(t.id)}>
                                {t.name}
                            </MenuItem>
                        )),
                    }}
                />
            </div>
            <div>
                <FieldLabel text="Sub-team" />
                <StyledTextField
                    name="sub_team_id"
                    value={String(form.data.sub_team_id)}
                    error={errors.sub_team_id ?? null}
                    handleChange={(e) => form.setData("sub_team_id", e.target.value ? Number(e.target.value) : "")}
                    props={{
                        select: true,
                        disabled: !form.data.team_id || subTeams.length === 0,
                        helperText: form.data.team_id && subTeams.length === 0 ? "This team has no active sub-teams." : "Optional. Leaving it empty takes the agent off their current sub-team.",
                        children: [
                            <MenuItem key="none" value="">
                                No sub-team
                            </MenuItem>,
                            ...subTeams.map((s) => (
                                <MenuItem key={s.id} value={String(s.id)}>
                                    {s.name}
                                </MenuItem>
                            )),
                        ],
                    }}
                />
            </div>
            <div>
                <FieldLabel text="Effective date" required />
                <StyledTextField type="date" name="date" value={form.data.date} error={errors.date ?? null} handleChange={(e) => form.setData("date", e.target.value)} />
            </div>
        </FormDialog>
    );
}
