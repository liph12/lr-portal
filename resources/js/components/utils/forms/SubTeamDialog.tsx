import { useEffect } from "react";
import { MenuItem } from "@mui/material";
import { useForm } from "@inertiajs/react";
import FormDialog from "./FormDialog";
import FieldLabel from "./FieldLabel";
import AgentPicker from "./AgentPicker";
import StyledTextField from "../StyledTextField";
import { AgentOption, SubTeamRow, TeamOption } from "../../../types/app-data-types";

interface SubTeamDialogProps {
    open: boolean;
    subTeam: SubTeamRow | null;
    teams: TeamOption[];
    statuses: string[];
    baseUrl: string;
    onClose: () => void;
}

interface SubTeamForm {
    team_id: number | "";
    name: string;
    leader: AgentOption | null;
    status: string;
}

export default function SubTeamDialog({ open, subTeam, teams, statuses, baseUrl, onClose }: SubTeamDialogProps) {
    const form = useForm<SubTeamForm>({ team_id: "", name: "", leader: null, status: "active" });
    const errors = form.errors as Record<string, string>;

    useEffect(() => {
        if (!open) return;
        form.setData({
            team_id: subTeam?.team_id ?? "",
            name: subTeam?.name ?? "",
            leader: subTeam ? { id: subTeam.agent_id, name: subTeam.leader_name ?? `Agent #${subTeam.agent_id}`, email: "", avatar: subTeam.leader_avatar } : null,
            status: subTeam?.status ?? "active",
        });
        form.clearErrors();
    }, [open, subTeam?.id]);

    const submit = () => {
        form.transform((d) => ({ team_id: d.team_id, name: d.name.trim(), agent_id: d.leader?.id ?? "", status: d.status }));
        const options = { preserveScroll: true, onSuccess: onClose };
        subTeam ? form.put(`${baseUrl}/sub-teams/${subTeam.id}`, options) : form.post(`${baseUrl}/sub-teams`, options);
    };

    return (
        <FormDialog
            open={open}
            title={subTeam ? `Edit ${subTeam.name}` : "New sub-team"}
            submitLabel={subTeam ? "Save" : "Create sub-team"}
            processing={form.processing}
            onSubmit={submit}
            onClose={onClose}
        >
            <div>
                <FieldLabel text="Team" required />
                <StyledTextField
                    name="team_id"
                    value={String(form.data.team_id)}
                    error={errors.team_id ?? null}
                    handleChange={(e) => form.setData("team_id", Number(e.target.value))}
                    props={{
                        select: true,
                        children: teams
                            .filter((t) => t.status !== "deactivated" || t.id === subTeam?.team_id)
                            .map((t) => (
                                <MenuItem key={t.id} value={String(t.id)}>
                                    {t.name}
                                </MenuItem>
                            )),
                    }}
                />
            </div>
            <div>
                <FieldLabel text="Sub-team name" required />
                <StyledTextField name="name" value={form.data.name} error={errors.name ?? null} handleChange={(e) => form.setData("name", e.target.value)} />
            </div>
            <div>
                <FieldLabel text="Sub-team leader" required />
                <AgentPicker name="leader" value={form.data.leader} onChange={(a) => form.setData("leader", a)} error={errors.agent_id ?? null} />
            </div>
            <div>
                <FieldLabel text="Status" required />
                <StyledTextField
                    name="status"
                    value={form.data.status}
                    error={errors.status ?? null}
                    handleChange={(e) => form.setData("status", e.target.value)}
                    props={{
                        select: true,
                        children: statuses.map((s) => (
                            <MenuItem key={s} value={s} sx={{ textTransform: "capitalize" }}>
                                {s}
                            </MenuItem>
                        )),
                    }}
                />
            </div>
        </FormDialog>
    );
}
