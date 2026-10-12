import { ReactNode, useEffect } from "react";
import { Box, FormControlLabel, Radio, RadioGroup, Typography } from "@mui/material";
import { useForm } from "@inertiajs/react";
import FormDialog from "./FormDialog";
import FieldLabel from "./FieldLabel";
import StyledTextField from "../StyledTextField";
import { AgentRow } from "../../../types/app-data-types";

interface DesignationDialogProps {
    agent: AgentRow | null;
    baseUrl: string;
    onClose: () => void;
}

interface DesignationForm {
    unit_manager_by: "none" | "rate" | "dashboard";
    unit_manager_since: string;
    is_broker: boolean;
    broker_since: string;
}

// Only agents (or current unit managers) can take or leave the Unit Manager role; anyone can be UM by rate or a broker.
const PROMOTABLE_ROLES = ["agent", "global_partner", "unit_manager"];

const today = () => new Date().toLocaleDateString("en-CA");

const radioSx = { "& .MuiRadio-root.Mui-checked": { color: "var(--lr-primary)" } };

function Choice({ value, label, help, disabled = false }: { value: string; label: string; help: string; disabled?: boolean }) {
    return (
        <FormControlLabel
            value={value}
            disabled={disabled}
            control={<Radio size="small" />}
            sx={{ alignItems: "flex-start", m: 0, "& .MuiRadio-root": { pt: 0.25 } }}
            label={
                <Box sx={{ pb: 0.75 }}>
                    <Typography variant="body2" sx={{ color: "var(--lr-text-primary)", fontWeight: 500 }}>
                        {label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                        {help}
                    </Typography>
                </Box>
            }
        />
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <Box sx={{ p: 2, borderRadius: 3, border: "1px solid var(--lr-border)" }}>
            <Typography sx={{ fontWeight: 500, color: "var(--lr-text-primary)", mb: 1 }}>{title}</Typography>
            {children}
        </Box>
    );
}

// Management › Agents › Designation: promote to Unit Manager by rate (designation only — they keep their dashboard) or
// by dashboard (the Unit Manager role), and mark brokers — each from the date it took effect.
export default function DesignationDialog({ agent, baseUrl, onClose }: DesignationDialogProps) {
    const form = useForm<DesignationForm>({ unit_manager_by: "none", unit_manager_since: today(), is_broker: false, broker_since: today() });
    const errors = form.errors as Record<string, string>;
    const canTakeRole = PROMOTABLE_ROLES.indexOf(agent?.role ?? "") !== -1;

    useEffect(() => {
        if (!agent) return;
        form.setData({
            unit_manager_by: agent.unit_manager_by ?? "none",
            unit_manager_since: agent.unit_manager_since ?? today(),
            is_broker: !!agent.is_broker,
            broker_since: agent.broker_since ?? today(),
        });
        form.clearErrors();
    }, [agent?.id]);

    const submit = () => {
        if (!agent) return;
        form.transform((d) => ({
            unit_manager_by: d.unit_manager_by,
            unit_manager_since: d.unit_manager_by === "none" ? null : d.unit_manager_since,
            is_broker: d.is_broker,
            broker_since: d.is_broker ? d.broker_since : null,
        }));
        form.put(`${baseUrl}/agents/${agent.id}/designation`, { preserveScroll: true, onSuccess: onClose });
    };

    return (
        <FormDialog open={agent !== null} title={`Designation — ${agent?.name ?? ""}`} submitLabel="Save" processing={form.processing} onSubmit={submit} onClose={onClose}>
            <Section title="Unit Manager">
                <RadioGroup
                    value={form.data.unit_manager_by}
                    onChange={(e) => form.setData("unit_manager_by", e.target.value as DesignationForm["unit_manager_by"])}
                    aria-label="Unit Manager"
                    sx={radioSx}
                >
                    <Choice value="none" label="Not a Unit Manager" help={agent?.role === "unit_manager" ? "Goes back to the Agent role and dashboard." : "No promotion."} disabled={!canTakeRole && agent?.unit_manager_by === "dashboard"} />
                    <Choice value="rate" label="By rate" help="Unit Manager rate only — keeps their current role and dashboard." />
                    <Choice
                        value="dashboard"
                        label="By dashboard"
                        help={canTakeRole ? "Gets the Unit Manager role and its dashboard." : `Only agents can take the Unit Manager role (now ${agent?.role_label ?? "no role"}).`}
                        disabled={!canTakeRole}
                    />
                </RadioGroup>
                {errors.unit_manager_by && (
                    <Typography variant="caption" sx={{ color: "var(--lr-error)", display: "block", mb: 1 }}>
                        {errors.unit_manager_by}
                    </Typography>
                )}
                {form.data.unit_manager_by !== "none" && (
                    <Box sx={{ mt: 1 }}>
                        <FieldLabel text="Promoted on" required />
                        <StyledTextField
                            type="date"
                            name="unit_manager_since"
                            value={form.data.unit_manager_since}
                            error={errors.unit_manager_since ?? null}
                            handleChange={(e) => form.setData("unit_manager_since", e.target.value)}
                            props={{ slotProps: { htmlInput: { max: today() } } }}
                        />
                    </Box>
                )}
            </Section>

            <Section title="Broker">
                <RadioGroup row value={form.data.is_broker ? "yes" : "no"} onChange={(e) => form.setData("is_broker", e.target.value === "yes")} aria-label="Broker" sx={radioSx}>
                    <FormControlLabel value="no" control={<Radio size="small" />} label="Not a broker" />
                    <FormControlLabel value="yes" control={<Radio size="small" />} label="Broker" />
                </RadioGroup>
                {form.data.is_broker && (
                    <Box sx={{ mt: 1 }}>
                        <FieldLabel text="Broker since" required />
                        <StyledTextField
                            type="date"
                            name="broker_since"
                            value={form.data.broker_since}
                            error={errors.broker_since ?? null}
                            handleChange={(e) => form.setData("broker_since", e.target.value)}
                            props={{ slotProps: { htmlInput: { max: today() } } }}
                        />
                    </Box>
                )}
            </Section>
        </FormDialog>
    );
}
