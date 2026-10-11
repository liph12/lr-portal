import { useEffect, useRef, useState } from "react";
import { Autocomplete, Box, CircularProgress, IconButton, InputBase, ListItemText, Menu, MenuItem, Tooltip, Typography } from "@mui/material";
import { CheckRounded, ChevronLeftRounded, ChevronRightRounded, MoreVertRounded, SearchRounded } from "@mui/icons-material";
import { router, usePage } from "@inertiajs/react";
import StyledTextField from "../utils/StyledTextField";
import UserAvatar from "../utils/user/UserAvatar";
import ConfirmDialog from "../utils/ConfirmDialog";
import UserStatusChip, { STATUS_LABELS } from "../utils/user/UserStatusChip";
import { UserSearchItem } from "../utils/search/UserSearchResult";
import { formatCount } from "../../helpers/formatNumber";
import { RoleItem, RoleMembersPage, RoleUserItem, UserStatus } from "../../types/app-data-types";

interface RoleMembersCardProps {
    role: RoleItem;
    members: RoleMembersPage;
    statuses: UserStatus[];
    currentUserId: number | null;
}

const STATUS_CONSEQUENCE: Record<UserStatus, string> = {
    active: "They will be able to sign in again.",
    inactive: "They will be signed out and can't sign in until reactivated.",
    resigned: "They will be signed out and can't sign in. Their records stay in the portal.",
    terminated: "They will be signed out and can't sign in. Their records stay in the portal.",
};

const DEBOUNCE_MS = 300;

export default function RoleMembersCard({ role, members, statuses, currentUserId }: RoleMembersCardProps) {
    const path = usePage().url.split("?")[0];
    const [saving, setSaving] = useState(false);
    const [loadingPage, setLoadingPage] = useState(false);
    const [menu, setMenu] = useState<{ anchor: HTMLElement; user: RoleUserItem } | null>(null);
    const [pendingStatus, setPendingStatus] = useState<{ user: RoleUserItem; status: UserStatus } | null>(null);
    const [pendingMove, setPendingMove] = useState<UserSearchItem | null>(null);

    // Candidates come from the server search (the same one the navbar uses), never a full user list.
    const [candidateQuery, setCandidateQuery] = useState("");
    const [candidates, setCandidates] = useState<UserSearchItem[]>([]);
    const [searching, setSearching] = useState(false);

    const [memberQuery, setMemberQuery] = useState(members.search);
    const firstRender = useRef(true);

    useEffect(() => setMemberQuery(members.search), [role.id]);

    const visit = (params: Record<string, string | number>) =>
        router.get(path, { role: role.id, ...params }, {
            only: ["members", "selectedRoleId"],
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setLoadingPage(true),
            onFinish: () => setLoadingPage(false),
        });

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }
        if (memberQuery === members.search) return;
        const timer = window.setTimeout(() => visit(memberQuery ? { members_q: memberQuery } : {}), DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [memberQuery]);

    useEffect(() => {
        const term = candidateQuery.trim();
        if (term.length < 2) {
            setCandidates([]);
            return;
        }
        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(`/search/users?q=${encodeURIComponent(term)}`, {
                    headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
                    credentials: "same-origin",
                    signal: controller.signal,
                });
                const data: { users: UserSearchItem[] } = res.ok ? await res.json() : { users: [] };
                setCandidates(data.users.filter((u) => u.role_id !== role.id && u.id !== currentUserId));
            } catch {
                // Aborted by a newer keystroke, or offline: keep whatever was shown.
            } finally {
                if (!controller.signal.aborted) setSearching(false);
            }
        }, DEBOUNCE_MS);
        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [candidateQuery, role.id, currentUserId]);

    const confirmMove = () => {
        if (!pendingMove) return;
        const user = pendingMove;
        setPendingMove(null);
        setCandidateQuery("");
        router.put(`/superadmin/settings/users/${user.id}/role`, { role_id: role.id }, {
            preserveScroll: true,
            onStart: () => setSaving(true),
            onFinish: () => setSaving(false),
        });
    };

    const saveStatus = (user: RoleUserItem, status: UserStatus) =>
        router.put(`/superadmin/settings/users/${user.id}/status`, { status }, {
            preserveScroll: true,
            onStart: () => setSaving(true),
            onFinish: () => setSaving(false),
        });

    const chooseStatus = (status: UserStatus) => {
        const user = menu?.user;
        setMenu(null);
        if (!user || status === user.status) return;
        // Reactivating is harmless; anything that blocks sign-in is confirmed first.
        if (status === "active") saveStatus(user, status);
        else setPendingStatus({ user, status });
    };

    const from = members.total === 0 ? 0 : (members.page - 1) * 20 + 1;
    const to = from + members.data.length - (members.total === 0 ? 0 : 1);

    return (
        <Box>
            <Autocomplete
                options={candidates}
                value={null}
                inputValue={candidateQuery}
                onInputChange={(_, v, reason) => reason !== "reset" && setCandidateQuery(v)}
                filterOptions={(x) => x}
                loading={searching}
                disabled={saving}
                blurOnSelect
                size="small"
                getOptionLabel={(u) => `${u.name} ${u.email}`}
                noOptionsText={candidateQuery.trim().length < 2 ? "Type at least 2 letters of a name or email" : "No matching users"}
                onChange={(_, u) => u && setPendingMove(u)}
                renderOption={({ key, ...props }, u) => (
                    <Box component="li" key={key} {...props} sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                        <UserAvatar name={u.name} src={u.avatar} size={28} />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="body2" sx={{ color: "var(--lr-text-primary)" }}>
                                {u.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                                {u.email} · currently {u.role_label ?? "no role"}
                                {u.status !== "active" && ` · ${STATUS_LABELS[u.status]}`}
                            </Typography>
                        </Box>
                    </Box>
                )}
                renderInput={(params) => (
                    <StyledTextField
                        params={{
                            ...params,
                            InputProps: {
                                ...params.InputProps,
                                endAdornment: searching ? <CircularProgress size={16} sx={{ mr: 1 }} /> : params.InputProps.endAdornment,
                            },
                        }}
                        name="add_member"
                        placeholder={`Add a user to ${role.label}…`}
                    />
                )}
            />
            <Typography variant="caption" component="p" sx={{ color: "var(--lr-text-secondary)", mt: 1, mb: 2 }}>
                Each user has one role. Adding someone here moves them from their current role.
            </Typography>

            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    px: 1.5,
                    py: 0.5,
                    mb: 1,
                    borderRadius: 99,
                    backgroundColor: "var(--lr-surface-container)",
                }}
            >
                {loadingPage ? <CircularProgress size={16} /> : <SearchRounded fontSize="small" sx={{ color: "var(--lr-text-secondary)" }} />}
                <InputBase
                    fullWidth
                    value={memberQuery}
                    onChange={(e) => setMemberQuery(e.target.value)}
                    placeholder={`Search ${formatCount(role.users_count)} ${role.label} members`}
                    inputProps={{ "aria-label": `Search ${role.label} members` }}
                    sx={{ fontSize: 14, color: "var(--lr-text-body)" }}
                />
            </Box>

            {members.data.length === 0 ? (
                <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", py: 1 }}>
                    {members.search ? `No ${role.label} members match "${members.search}".` : "No one has this role yet."}
                </Typography>
            ) : (
                <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 0.5, opacity: loadingPage ? 0.6 : 1 }}>
                    {members.data.map((u) => (
                        <Box component="li" key={u.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 1, py: 0.75, borderRadius: 2 }}>
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

            {members.total > 0 && (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1.5 }}>
                    <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                        {formatCount(from)}–{formatCount(to)} of {formatCount(members.total)}
                    </Typography>
                    <Box>
                        <IconButton
                            size="small"
                            aria-label="Previous page"
                            disabled={members.page <= 1 || loadingPage}
                            onClick={() => visit({ members_page: members.page - 1, ...(members.search ? { members_q: members.search } : {}) })}
                        >
                            <ChevronLeftRounded fontSize="small" />
                        </IconButton>
                        <IconButton
                            size="small"
                            aria-label="Next page"
                            disabled={members.page >= members.last_page || loadingPage}
                            onClick={() => visit({ members_page: members.page + 1, ...(members.search ? { members_q: members.search } : {}) })}
                        >
                            <ChevronRightRounded fontSize="small" />
                        </IconButton>
                    </Box>
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
                open={pendingMove !== null}
                title={`Make ${pendingMove?.name} a ${role.label}?`}
                message={`They will be moved from ${pendingMove?.role_label ?? "no role"} to ${role.label} and get ${role.label}'s permissions.`}
                confirmLabel={`Move to ${role.label}`}
                tone="primary"
                onConfirm={confirmMove}
                onClose={() => setPendingMove(null)}
            />
        </Box>
    );
}
