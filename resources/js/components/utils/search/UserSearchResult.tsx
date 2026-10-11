import { MouseEvent, useState } from "react";
import { Box, ButtonBase, ListItemText, Menu, MenuItem, Tooltip, Typography } from "@mui/material";
import { CheckRounded, ExpandMoreRounded } from "@mui/icons-material";
import UserAvatar from "../user/UserAvatar";
import UserStatusChip, { STATUS_LABELS } from "../user/UserStatusChip";
import { UserStatus } from "../../../types/app-data-types";

export interface UserSearchItem {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    role_id: number | null;
    role_label: string | null;
    status: UserStatus;
}

export type UserChange = { kind: "role"; roleId: number; label: string } | { kind: "status"; status: UserStatus };

interface UserSearchResultProps {
    user: UserSearchItem;
    active: boolean;
    isSelf: boolean;
    canManage: boolean;
    busy: boolean;
    roles: { id: number; label: string }[];
    statuses: UserStatus[];
    onChange: (user: UserSearchItem, change: UserChange) => void;
    onHover: () => void;
}

export default function UserSearchResult({
    user,
    active,
    isSelf,
    canManage,
    busy,
    roles,
    statuses,
    onChange,
    onHover,
}: UserSearchResultProps) {
    const [menu, setMenu] = useState<{ anchor: HTMLElement; kind: "role" | "status" } | null>(null);
    const editable = canManage && !isSelf;

    const open = (kind: "role" | "status") => (e: MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        setMenu({ anchor: e.currentTarget, kind });
    };

    const pick = (change: UserChange) => {
        setMenu(null);
        onChange(user, change);
    };

    const roleChip = (
        <Typography
            component="span"
            variant="caption"
            sx={{
                display: "inline-flex",
                alignItems: "center",
                px: 1,
                py: 0.25,
                borderRadius: 99,
                fontWeight: 500,
                color: "var(--lr-primary)",
                backgroundColor: "var(--lr-primary-soft)",
                whiteSpace: "nowrap",
            }}
        >
            {user.role_label ?? "No role"}
            {editable && <ExpandMoreRounded sx={{ fontSize: 14, ml: 0.25 }} />}
        </Typography>
    );

    const statusChip = (
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center" }}>
            <UserStatusChip status={user.status} />
            {editable && <ExpandMoreRounded sx={{ fontSize: 14, color: "var(--lr-text-secondary)" }} />}
        </Box>
    );

    return (
        <Box
            role="option"
            aria-selected={active}
            onMouseEnter={onHover}
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 2,
                py: 1,
                flexWrap: { xs: "wrap", sm: "nowrap" },
                backgroundColor: active ? "var(--lr-surface-container)" : "transparent",
            }}
        >
            <UserAvatar name={user.name} src={user.avatar} size={32} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ color: "var(--lr-text-primary)", fontWeight: 500 }}>
                    {user.name}
                    {isSelf && (
                        <Typography component="span" variant="caption" sx={{ color: "var(--lr-text-secondary)", ml: 0.75 }}>
                            (you)
                        </Typography>
                    )}
                </Typography>
                <Typography
                    variant="caption"
                    sx={{ color: "var(--lr-text-secondary)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                    {user.email}
                </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, ml: { xs: 5.5, sm: 0 } }}>
                {editable ? (
                    <>
                        <ButtonBase disabled={busy} onClick={open("role")} aria-label={`Change role for ${user.name}`} sx={{ borderRadius: 99 }}>
                            {roleChip}
                        </ButtonBase>
                        <ButtonBase disabled={busy} onClick={open("status")} aria-label={`Change status for ${user.name}`} sx={{ borderRadius: 99 }}>
                            {statusChip}
                        </ButtonBase>
                    </>
                ) : (
                    <Tooltip title={canManage && isSelf ? "You can't change your own role or status" : ""} disableHoverListener={!(canManage && isSelf)}>
                        <Box component="span" sx={{ display: "inline-flex", gap: 0.75 }}>
                            {roleChip}
                            {statusChip}
                        </Box>
                    </Tooltip>
                )}
            </Box>

            <Menu
                anchorEl={menu?.anchor}
                open={menu !== null}
                onClose={() => setMenu(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 180, border: "1px solid var(--lr-border)" } } }}
            >
                {menu?.kind === "role" &&
                    roles.map((r) => (
                        <MenuItem key={r.id} selected={r.id === user.role_id} onClick={() => pick({ kind: "role", roleId: r.id, label: r.label })}>
                            <ListItemText primary={r.label} slotProps={{ primary: { sx: { fontSize: 14 } } }} />
                            {r.id === user.role_id && <CheckRounded fontSize="small" sx={{ ml: 1, color: "var(--lr-primary)" }} />}
                        </MenuItem>
                    ))}
                {menu?.kind === "status" &&
                    statuses.map((s) => (
                        <MenuItem key={s} selected={s === user.status} onClick={() => pick({ kind: "status", status: s })}>
                            <ListItemText primary={STATUS_LABELS[s]} slotProps={{ primary: { sx: { fontSize: 14 } } }} />
                            {s === user.status && <CheckRounded fontSize="small" sx={{ ml: 1, color: "var(--lr-primary)" }} />}
                        </MenuItem>
                    ))}
            </Menu>
        </Box>
    );
}
