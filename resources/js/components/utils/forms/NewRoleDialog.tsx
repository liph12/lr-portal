import { ChangeEvent, FormEvent } from "react";
import { Box, Dialog, DialogActions, DialogContent, DialogTitle, FormHelperText } from "@mui/material";
import { useForm } from "@inertiajs/react";
import StyledTextField from "../StyledTextField";
import StyledAutocomplete from "../StyledAutocomplete";
import StyledButton from "../StyledButton";
import { RoleItem } from "../../../types/app-data-types";

interface NewRoleDialogProps {
    open: boolean;
    roles: RoleItem[];
    allPermissionIds: number[];
    onClose: () => void;
}

const labelSx = { color: "var(--lr-text-secondary)", fontWeight: 500, mb: 0.5, ml: 0.5 };

export default function NewRoleDialog({ open, roles, allPermissionIds, onClose }: NewRoleDialogProps) {
    const form = useForm<{ label: string; copy_from: { id: number; label: string } | null }>({
        label: "",
        copy_from: null,
    });
    const roleOptions = roles.map((r) => ({ id: r.id, label: r.label }));

    const close = () => {
        form.reset();
        form.clearErrors();
        onClose();
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const source = roles.find((r) => r.id === form.data.copy_from?.id);

        // Copying gives the new role a starting set of permissions to adjust afterwards.
        form.transform((d) => ({
            label: d.label,
            permission_ids: source ? (source.is_superadmin ? allPermissionIds : source.permission_ids) : [],
        }));
        form.post("/superadmin/settings/roles", { preserveScroll: true, onSuccess: close });
    };

    const nameError = (form.errors as Record<string, string | undefined>).name;

    return (
        <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
            <Box component="form" onSubmit={handleSubmit} noValidate>
                <DialogTitle sx={{ fontSize: 18 }}>New role</DialogTitle>
                <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box>
                        <FormHelperText sx={labelSx}>Role name</FormHelperText>
                        <StyledTextField
                            name="label"
                            placeholder="e.g. Agent, Unit Manager, Team Leader"
                            value={form.data.label}
                            error={form.errors.label ?? nameError ?? null}
                            handleChange={(e: ChangeEvent<HTMLInputElement>) => form.setData("label", e.target.value)}
                            props={{ autoFocus: true }}
                        />
                    </Box>
                    <Box>
                        <FormHelperText sx={labelSx}>Copy permissions from (optional)</FormHelperText>
                        <StyledAutocomplete
                            options={roleOptions}
                            value={form.data.copy_from}
                            renderInput={(params) => <StyledTextField params={params} name="copy_from" placeholder="Start with no permissions" />}
                            onChange={(_, v) => form.setData("copy_from", v ? { id: Number(v.id), label: v.label } : null)}
                            isOptionEqualToValue={(o, v) => o.id === v.id}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <StyledButton onClick={close} sx={{ color: "var(--lr-text-secondary)" }}>
                        Cancel
                    </StyledButton>
                    <StyledButton
                        type="submit"
                        variant="contained"
                        loading={form.processing}
                        disabled={!form.data.label.trim()}
                        sx={{ px: 3, backgroundColor: "var(--lr-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } }}
                    >
                        Create role
                    </StyledButton>
                </DialogActions>
            </Box>
        </Dialog>
    );
}
