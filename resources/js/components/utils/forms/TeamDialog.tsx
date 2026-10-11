import { useEffect } from "react";
import { MenuItem } from "@mui/material";
import { useForm } from "@inertiajs/react";
import FormDialog from "./FormDialog";
import FieldLabel from "./FieldLabel";
import AgentPicker from "./AgentPicker";
import StyledTextField from "../StyledTextField";
import { AgentOption, TeamRow } from "../../../types/app-data-types";

interface TeamDialogProps {
    open: boolean;
    // Editing this team, or creating a new one when null.
    team: TeamRow | null;
    statuses: string[];
    baseUrl: string;
    onClose: () => void;
}

interface TeamForm {
    name: string;
    leader: AgentOption | null;
    status: string;
}

const leaderOf = (team: TeamRow | null): AgentOption | null =>
    team ? { id: team.agent_id, name: team.leader_name ?? `Agent #${team.agent_id}`, email: "", avatar: team.leader_avatar } : null;

export default function TeamDialog({ open, team, statuses, baseUrl, onClose }: TeamDialogProps) {
    const form = useForm<TeamForm>({ name: "", leader: null, status: "active" });

    useEffect(() => {
        if (!open) return;
        form.setData({ name: team?.name ?? "", leader: leaderOf(team), status: team?.status ?? "active" });
        form.clearErrors();
        // Reset only when the dialog opens for a (different) team.
    }, [open, team?.id]);

    const submit = () => {
        form.transform((d) => ({ name: d.name.trim(), agent_id: d.leader?.id ?? "", status: d.status }));
        const options = { preserveScroll: true, onSuccess: onClose };
        team ? form.put(`${baseUrl}/teams/${team.id}`, options) : form.post(`${baseUrl}/teams`, options);
    };

    return (
        <FormDialog
            open={open}
            title={team ? `Edit ${team.name}` : "New team"}
            submitLabel={team ? "Save" : "Create team"}
            processing={form.processing}
            onSubmit={submit}
            onClose={onClose}
        >
            <div>
                <FieldLabel text="Team name" required />
                <StyledTextField name="name" value={form.data.name} error={form.errors.name ?? null} handleChange={(e) => form.setData("name", e.target.value)} />
            </div>
            <div>
                <FieldLabel text="Team leader" required />
                <AgentPicker name="leader" value={form.data.leader} onChange={(a) => form.setData("leader", a)} error={(form.errors as Record<string, string>).agent_id ?? null} />
            </div>
            <div>
                <FieldLabel text="Status" required />
                <StyledTextField
                    name="status"
                    value={form.data.status}
                    error={form.errors.status ?? null}
                    handleChange={(e) => form.setData("status", e.target.value)}
                    props={{
                        select: true,
                        children: statuses.map((s) => (
                            <MenuItem key={s} value={s} sx={{ textTransform: "capitalize" }}>
                                {s}
                            </MenuItem>
                        )),
                        helperText: form.data.status === "deactivated" && team?.status !== "deactivated" ? "Deactivating closes the team: its members and sub-teams are let go from today." : undefined,
                    }}
                />
            </div>
        </FormDialog>
    );
}
