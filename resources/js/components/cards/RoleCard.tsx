import { Box, Typography } from "@mui/material";
import { LockOutlined } from "@mui/icons-material";
import { RoleItem } from "../../types/app-data-types";

interface RoleCardProps {
    role: RoleItem;
    totalPermissions: number;
    selected: boolean;
    onSelect: () => void;
}

export default function RoleCard({ role, totalPermissions, selected, onSelect }: RoleCardProps) {
    const permissionCount = role.is_superadmin ? totalPermissions : role.permission_ids.length;

    return (
        <Box
            component="button"
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            sx={{
                all: "unset",
                boxSizing: "border-box",
                width: "100%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 2,
                py: 1.5,
                borderRadius: 3,
                border: "1px solid",
                borderColor: selected ? "var(--lr-primary)" : "var(--lr-border)",
                backgroundColor: selected ? "var(--lr-primary-soft)" : "var(--lr-surface)",
                transition: "background-color 0.15s, border-color 0.15s",
                ":hover": { backgroundColor: selected ? "var(--lr-primary-soft)" : "var(--lr-surface-dim)" },
                ":focus-visible": { outline: "2px solid var(--lr-primary)", outlineOffset: 2 },
            }}
        >
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    variant="body2"
                    sx={{
                        fontWeight: 500,
                        color: selected ? "var(--lr-primary)" : "var(--lr-text-primary)",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                    }}
                >
                    {role.label}
                    {role.is_system && (
                        <LockOutlined sx={{ fontSize: 14, color: "var(--lr-text-secondary)" }} aria-label="Built-in role" />
                    )}
                </Typography>
                <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                    {role.users_count} {role.users_count === 1 ? "user" : "users"} ·{" "}
                    {role.is_superadmin ? "All permissions" : `${permissionCount} of ${totalPermissions} permissions`}
                </Typography>
            </Box>
        </Box>
    );
}
