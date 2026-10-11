import { useMemo, useState } from "react";
import { Autocomplete, Box, IconButton, ListItemText, Menu, MenuItem, Tooltip, Typography } from "@mui/material";
import { CheckRounded, MoreVertRounded } from "@mui/icons-material";
import { router } from "@inertiajs/react";
import StyledTextField from "../utils/StyledTextField";
import UserAvatar from "../utils/user/UserAvatar";
import ConfirmDialog from "../utils/ConfirmDialog";
import UserStatusChip, { STATUS_LABELS } from "../utils/user/UserStatusChip";
import { RoleItem, RoleUserItem, UserStatus } from "../../types/app-data-types";

interface RoleMembersCardProps {
    role: RoleItem;
    roles: RoleItem[];
    users: RoleUserItem[];
    statuses: UserStatus[];
    currentUserId: number | null;
}

const STATUS_CONSEQUENCE: Record<UserStatus, string> = {
    active: "They will be able to sign in again.",
    inactive: "They will be signed out and can't sign in until reactivated.",
    resigned: "They will be signed out and can't sign in. Their records stay in the portal.",
    terminated: "They will be signed out and can't sign in. Their records stay in the portal.",
};

export default function RoleMembersCard({ role, roles, users, statuses, currentUserId }: RoleMembersCardProps) {
    const [menu, setMenu] = useState<{ anchor: HTMLElement; user: RoleUserItem } | null>(null);
    const [pendingStatus, setPendingStatus] = useState<{ user: RoleUserItem; status: UserStatus } | null>(null);
    const [pending, setPending] = useState<RoleUserItem | null>(null);
    const [saving, setSaving] = useState(false);

    const roleLabel = (id: number | null) => roles.find((r) => r.id === id)?.label ?? "No role";
    const members = useMemo(() => users.filter((u) => u.role_id === role.id), [users, role.id]);
    // Your own role is locked (server-side too), so you aren't offered as a candidate.
    const candidates = useMemo(
        () => users.filter((u) => u.role_id !== role.id && u.id !== currentUserId),
        [users, role.id, currentUserId],
    );

    const confirmMove = () => {
        if (!pending) return;
        const user = pending;
        setPending(null);
        router.put(
            `/superadmin/settings/users/${user.id}/role`,
            { role_id: role.id },
            {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onFinish: () => setSaving(false),
            },
        );
    };

    const saveStatus = (user: RoleUserItem, status: UserStatus) =>
        router.put(
            `/superadmin/settings/users/${user.id}/status`,
            { status },
            {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onFinish: () => setSaving(false),
            },
        );

    const chooseStatus = (status: UserStatus) => {
        const user = menu?.user;
        setMenu(null);
        if (!user || status === user.status) return;
        // Reactivating is harmless; anything that blocks sign-in is confirmed first.
        if (status === "active") saveStatus(user, status);
        else setPendingStatus({ user, status });
    };

    return (
        <Box>
            <Autocomplete
                options={candidates}
                value={null}
                disabled={saving || candidates.length === 0}
                blurOnSelect
                clearOnBlur
                size="small"
                getOptionLabel={(u) => `${u.name} ${u.email}`}
                noOptionsText="No matching users"
                onChange={(_, u) => u && setPending(u)}
                renderOption={({ key, ...props }, u) => (
                    <Box component="li" key={key} {...props} sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                        <UserAvatar name={u.name} src={u.avatar} size={28} />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="body2" sx={{ color: "var(--lr-text-primary)" }}>
                                {u.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                                {u.email} · currently {roleLabel(u.role_id)}
                                {u.status !== "active" && ` · ${STATUS_LABELS[u.status]}`}
                            </Typography>
                        </Box>
                    </Box>
                )}
                renderInput={(params) => (
                    <StyledTextField
                        params={params}
                        name="add_member"
                        placeholder={candidates.length ? `Add a user to ${role.label}…` : "Every user already has this role"}
                    />
                )}
            />
            <Typography variant="caption" component="p" sx={{ color: "var(--lr-text-secondary)", mt: 1, mb: 2 }}>
                Each user has one role. Adding someone here moves them from their current role.
            </Typography>

            {members.length === 0 ? (
                <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", py: 1 }}>
                    No one has this role yet.
                </Typography>
            ) : (
                <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 0.5 }}>
                    {members.map((u) => (
                        <Box
                            component="li"
                            key={u.id}
                            sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 1, py: 0.75, borderRadius: 2 }}
                        >
                            <UserAvatar name={u.name} src={u.avatar} size={32} />
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography variant="body2" sx={{ color: "var(--lr-text-primary)", fontWeight: 500 }}>
                                    {u.name}
                                    {u.id === currentUserId && (
                                        <Typography component="span" variant="caption" sx={{ color: "var(--lr-text-secondary)", ml: 0.75 }}>
                                            (you)
                                        </Typography>
                                    )}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{ color: "var(--lr-text-secondary)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                >
                                    {u.email}
                                </Typography>
                            </Box>
                            <UserStatusChip status={u.status} />
                            <Tooltip title={u.id === currentUserId ? "You can't change your own status" : "Change status"}>
                                <span>
                                    <IconButton
                                        size="small"
                                        aria-label={`Change status for ${u.name}`}
                                        disabled={saving || u.id === currentUserId}
                                        onClick={(e) => setMenu({ anchor: e.currentTarget, user: u })}
                                        sx={{ color: "var(--lr-text-secondary)" }}
                                    >
                                        <MoreVertRounded fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Box>
                    ))}
                </Box>
            )}

            <Menu
                anchorEl={menu?.anchor}
                open={menu !== null}
                onClose={() => setMenu(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 180, border: "1px solid var(--lr-border)" } } }}
            >
                {statuses.map((status) => (
                    <MenuItem key={status} selected={menu?.user.status === status} onClick={() => chooseStatus(status)}>
                        <ListItemText primary={STATUS_LABELS[status]} slotProps={{ primary: { sx: { fontSize: 14 } } }} />
                        {menu?.user.status === status && <CheckRounded fontSize="small" sx={{ ml: 1, color: "var(--lr-primary)" }} />}
                    </MenuItem>
                ))}
            </Menu>

            <ConfirmDialog
                open={pendingStatus !== null}
                title={`Mark ${pendingStatus?.user.name} as ${pendingStatus ? STATUS_LABELS[pendingStatus.status] : ""}?`}
                message={pendingStatus ? STATUS_CONSEQUENCE[pendingStatus.status] : ""}
                confirmLabel={`Mark as ${pendingStatus ? STATUS_LABELS[pendingStatus.status] : ""}`}
                tone="danger"
                onConfirm={() => {
                    if (pendingStatus) saveStatus(pendingStatus.user, pendingStatus.status);
                    setPendingStatus(null);
                }}
                onClose={() => setPendingStatus(null)}
            />

            <ConfirmDialog
                open={pending !== null}
                title={`Make ${pending?.name} a ${role.label}?`}
                message={`They will be moved from ${roleLabel(pending?.role_id ?? null)} to ${role.label} and get ${role.label}'s permissions.`}
                confirmLabel={`Move to ${role.label}`}
                tone="primary"
                onConfirm={confirmMove}
                onClose={() => setPending(null)}
            />
        </Box>
    );
}
