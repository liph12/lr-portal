import { ChangeEvent, FormEvent, useState } from "react";
import { Box, Chip, Typography } from "@mui/material";
import { AddRounded } from "@mui/icons-material";
import { router, useForm } from "@inertiajs/react";
import StyledTextField from "../utils/StyledTextField";
import StyledButton from "../utils/StyledButton";
import ConfirmDialog from "../utils/ConfirmDialog";
import { PermissionItem } from "../../types/app-data-types";

interface PermissionsCardProps {
    permissions: PermissionItem[];
    selectedRoleId: number | null;
}

export default function PermissionsCard({ permissions, selectedRoleId }: PermissionsCardProps) {
    const form = useForm({ label: "" });
    const [pendingDelete, setPendingDelete] = useState<PermissionItem | null>(null);
    const nameError = (form.errors as Record<string, string | undefined>).name;

    const handleAdd = (e: FormEvent) => {
        e.preventDefault();
        // Keeps the currently open role selected after the page reloads.
        form.transform((d) => ({ ...d, selected_role: selectedRoleId }));
        form.post("/superadmin/settings/permissions", {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    const handleDelete = () => {
        if (!pendingDelete) return;
        router.delete(`/superadmin/settings/permissions/${pendingDelete.id}`, {
            data: { selected_role: selectedRoleId },
            preserveScroll: true,
        });
        setPendingDelete(null);
    };

    return (
        <Box>
            <Box component="form" onSubmit={handleAdd} noValidate sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                <Box sx={{ flex: 1 }}>
                    <StyledTextField
                        name="label"
                        placeholder="New permission, e.g. Approve Sales"
                        value={form.data.label}
                        error={form.errors.label ?? nameError ?? null}
                        handleChange={(e: ChangeEvent<HTMLInputElement>) => form.setData("label", e.target.value)}
                    />
                </Box>
                <StyledButton
                    type="submit"
                    variant="contained"
                    startIcon={<AddRounded />}
                    loading={form.processing}
                    disabled={!form.data.label.trim()}
                    sx={{ flexShrink: 0, mt: 0.25, backgroundColor: "var(--lr-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } }}
                >
                    Add
                </StyledButton>
            </Box>
            <Typography variant="caption" component="p" sx={{ color: "var(--lr-text-secondary)", mt: 1, mb: 2 }}>
                New permissions are given to Superadmin automatically. Tick them on other roles to grant them.
            </Typography>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {permissions.map((p) => (
                    <Chip
                        key={p.id}
                        label={p.label}
                        title={`${p.name} · used by ${p.roles_count} ${p.roles_count === 1 ? "role" : "roles"}`}
                        onDelete={() => setPendingDelete(p)}
                        sx={{
                            borderRadius: 99,
                            color: "var(--lr-text-body)",
                            backgroundColor: "var(--lr-surface-container)",
                            "& .MuiChip-deleteIcon": { color: "var(--lr-text-secondary)" },
                            "& .MuiChip-deleteIcon:hover": { color: "var(--lr-error)" },
                        }}
                    />
                ))}
            </Box>

            <ConfirmDialog
                open={pendingDelete !== null}
                title={`Delete "${pendingDelete?.label}"?`}
                message={
                    pendingDelete && pendingDelete.roles_count > 0
                        ? `It will be removed from ${pendingDelete.roles_count} ${pendingDelete.roles_count === 1 ? "role" : "roles"}. This can't be undone.`
                        : "This can't be undone."
                }
                confirmLabel="Delete permission"
                onConfirm={handleDelete}
                onClose={() => setPendingDelete(null)}
            />
        </Box>
    );
}
