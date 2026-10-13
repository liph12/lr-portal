import { Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import { CloseRounded } from "@mui/icons-material";
import ProfileDetailsForm from "../utils/forms/ProfileDetailsForm";
import { ProfileFields } from "../../types/app-data-types";

interface EditAgentProfileDialogProps {
    open: boolean;
    agentId: number;
    // As sent by the server (nulls for empty fields).
    profile: Record<keyof ProfileFields, string | null>;
    maritalStatuses: string[];
    onClose: () => void;
}

// An agent's details edited from their profile page (edit_agent_profile): the same form as "my profile".
export default function EditAgentProfileDialog({ open, agentId, profile, maritalStatuses, onClose }: EditAgentProfileDialogProps) {
    const fields = Object.fromEntries(Object.entries(profile).map(([key, value]) => [key, key === "gender" || key === "marital_status" ? value : (value ?? "")])) as unknown as ProfileFields;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontSize: 18, pr: 6 }}>
                Edit profile
                <IconButton aria-label="Close" onClick={onClose} sx={{ position: "absolute", right: 12, top: 12, color: "var(--lr-text-secondary)" }}>
                    <CloseRounded />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: "4px !important" }}>
                {/* Remounted on each open, so it starts from the saved values. */}
                {open && <ProfileDetailsForm profile={fields} maritalStatuses={maritalStatuses} action={{ url: `/agents/${agentId}`, method: "put" }} onSaved={onClose} />}
            </DialogContent>
        </Dialog>
    );
}
