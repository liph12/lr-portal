import { ChangeEvent, FormEvent, useState } from "react";
import { Box, Checkbox, FormHelperText, Tooltip, Typography } from "@mui/material";
import { DeleteOutlineRounded } from "@mui/icons-material";
import { router, useForm } from "@inertiajs/react";
import StyledTextField from "../StyledTextField";
import StyledButton from "../StyledButton";
import ConfirmDialog from "../ConfirmDialog";
import { PermissionItem, RoleItem } from "../../../types/app-data-types";

interface RoleEditorFormProps {
    role: RoleItem;
    permissions: PermissionItem[];
}

const labelSx = { color: "var(--lr-text-secondary)", fontWeight: 500, mb: 0.5, ml: 0.5 };

export default function RoleEditorForm({ role, permissions }: RoleEditorFormProps) {
    const allIds = permissions.map((p) => p.id);
    const form = useForm({
        label: role.label,
        permission_ids: role.is_superadmin ? allIds : role.permission_ids,
    });
    const [confirmDelete, setConfirmDelete] = useState(false);

    const locked = role.is_superadmin;
    const deleteBlockedReason = role.is_system
        ? "Built-in roles can't be deleted."
        : role.users_count > 0
          ? `Assigned to ${role.users_count} ${role.users_count === 1 ? "user" : "users"}; move them first.`
          : null;

    const toggle = (id: number) =>
        form.setData(
            "permission_ids",
            form.data.permission_ids.indexOf(id) === -1
                ? [...form.data.permission_ids, id]
                : form.data.permission_ids.filter((p) => p !== id),
        );

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.put(`/superadmin/settings/roles/${role.id}`, {
            preserveScroll: true,
            onSuccess: () => form.setDefaults(),
        });
    };

    const handleDelete = () => {
        setConfirmDelete(false);
        router.delete(`/superadmin/settings/roles/${role.id}`, { preserveScroll: true });
    };

    return (
        <Box component="form" onSubmit={handleSubmit} noValidate>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-start", mb: 3 }}>
                <Box sx={{ flex: "1 1 260px" }}>
                    <FormHelperText sx={labelSx}>Role name</FormHelperText>
                    <StyledTextField
                        name="label"
                        value={form.data.label}
                        error={form.errors.label ?? null}
                        handleChange={(e: ChangeEvent<HTMLInputElement>) => form.setData("label", e.target.value)}
                    />
                </Box>
                <Box>
                    <FormHelperText sx={labelSx}>Used in code as</FormHelperText>
                    <Typography
                        component="code"
                        sx={{
                            display: "inline-block",
                            px: 1.25,
                            py: 0.75,
                            borderRadius: 2,
                            fontFamily: "Google Sans Code, monospace",
                            fontSize: 13,
                            color: "var(--lr-text-body)",
                            backgroundColor: "var(--lr-surface-container)",
                        }}
                    >
                        role:{role.name}
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, color: "var(--lr-text-primary)" }}>
                    Permissions
                    <Typography component="span" variant="caption" sx={{ color: "var(--lr-text-secondary)", ml: 1 }}>
                        {form.data.permission_ids.length} of {permissions.length}
                    </Typography>
                </Typography>
                {!locked && permissions.length > 0 && (
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                        <StyledButton size="small" onClick={() => form.setData("permission_ids", allIds)} sx={{ color: "var(--lr-primary)" }}>
                            Select all
                        </StyledButton>
                        <StyledButton size="small" onClick={() => form.setData("permission_ids", [])} sx={{ color: "var(--lr-text-secondary)" }}>
                            Clear
                        </StyledButton>
                    </Box>
                )}
            </Box>

            {locked && (
                <Typography variant="caption" component="p" sx={{ color: "var(--lr-text-secondary)", mb: 1 }}>
                    Superadmin always has every permission, including new ones.
                </Typography>
            )}

            {permissions.length === 0 ? (
                <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", py: 2 }}>
                    No permissions yet. Add one in the Permissions panel.
                </Typography>
            ) : (
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                        gap: 0.5,
                    }}
                >
                    {permissions.map((p) => {
                        const checked = form.data.permission_ids.indexOf(p.id) !== -1;
                        return (
                            <Box
                                key={p.id}
                                component="label"
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                    pr: 1,
                                    borderRadius: 2,
                                    cursor: locked ? "default" : "pointer",
                                    ":hover": { backgroundColor: locked ? "transparent" : "var(--lr-surface-dim)" },
                                }}
                            >
                                <Checkbox size="small" checked={checked} disabled={locked} onChange={() => toggle(p.id)} />
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="body2" sx={{ color: "var(--lr-text-body)", lineHeight: 1.3 }}>
                                        {p.label}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{ color: "var(--lr-text-secondary)", fontFamily: "Google Sans Code, monospace", fontSize: 11 }}
                                    >
                                        {p.name}
                                    </Typography>
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            )}

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "space-between", mt: 3 }}>
                <Tooltip title={deleteBlockedReason ?? ""} disableHoverListener={!deleteBlockedReason}>
                    <span>
                        <StyledButton
                            startIcon={<DeleteOutlineRounded />}
                            disabled={!!deleteBlockedReason || form.processing}
                            onClick={() => setConfirmDelete(true)}
                            sx={{ color: "var(--lr-error)", ":hover": { backgroundColor: "var(--lr-error-soft)" } }}
                        >
                            Delete role
                        </StyledButton>
                    </span>
                </Tooltip>
                <Box sx={{ display: "flex", gap: 1 }}>
                    <StyledButton
                        disabled={!form.isDirty || form.processing}
                        onClick={() => {
                            form.reset();
                            form.clearErrors();
                        }}
                        sx={{ color: "var(--lr-text-secondary)" }}
                    >
                        Discard
                    </StyledButton>
                    <StyledButton
                        type="submit"
                        variant="contained"
                        loading={form.processing}
                        disabled={!form.isDirty}
                        sx={{ px: 3, backgroundColor: "var(--lr-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } }}
                    >
                        Save role
                    </StyledButton>
                </Box>
            </Box>

            <ConfirmDialog
                open={confirmDelete}
                title={`Delete ${role.label}?`}
                message="This removes the role and its permission settings. This can't be undone."
                confirmLabel="Delete role"
                onConfirm={handleDelete}
                onClose={() => setConfirmDelete(false)}
            />
        </Box>
    );
}
