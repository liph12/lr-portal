import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Box, CircularProgress, ClickAwayListener, InputBase, Paper, Popper, Typography } from "@mui/material";
import { NorthEastRounded, SearchRounded } from "@mui/icons-material";
import { router } from "@inertiajs/react";
import useAuthUser from "../../../hooks/useAuthUser";
import { buildPageIndex, PageResult, searchPages } from "../../../helpers/searchPages";
import ConfirmDialog from "../ConfirmDialog";
import UserSearchResult, { UserChange, UserSearchItem } from "./UserSearchResult";
import { STATUS_LABELS } from "../user/UserStatusChip";
import { UserStatus } from "../../../types/app-data-types";

interface GlobalSearchProps {
    autoFocus?: boolean;
    // Called after navigating away, e.g. so the mobile overlay can close itself.
    onDone?: () => void;
}

interface UserSearchResponse {
    users: UserSearchItem[];
    roles: { id: number; label: string }[];
    statuses: UserStatus[];
}

const DEBOUNCE_MS = 250;

function SectionLabel({ children }: { children: string }) {
    return (
        <Typography
            variant="caption"
            component="div"
            sx={{ px: 2, pt: 1.5, pb: 0.5, color: "var(--lr-text-secondary)", fontWeight: 500, letterSpacing: 0.3 }}
        >
            {children}
        </Typography>
    );
}

// The "/" shortcut skips anything the user is already typing into.
const isTypingTarget = (el: EventTarget | null) =>
    el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

export default function GlobalSearch({ autoFocus = false, onDone }: GlobalSearchProps) {
    const user = useAuthUser();
    const canSearchUsers = !!user?.can.search_users;
    const canManage = !!user?.can.manage_users;

    const anchorRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [people, setPeople] = useState<UserSearchResponse>({ users: [], roles: [], statuses: [] });
    const [peopleError, setPeopleError] = useState<string | null>(null);
    const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
    const [pending, setPending] = useState<{ user: UserSearchItem; change: UserChange } | null>(null);
    const [saving, setSaving] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const pageIndex = useMemo(() => buildPageIndex(!!user?.can.access_superadmin), [user?.can.access_superadmin]);
    const pages = useMemo(() => searchPages(pageIndex, query), [pageIndex, query]);
    const term = query.trim();
    const items: ({ type: "page"; page: PageResult } | { type: "user"; user: UserSearchItem })[] = [
        ...pages.map((page) => ({ type: "page" as const, page })),
        ...people.users.map((u) => ({ type: "user" as const, user: u })),
    ];

    useEffect(() => {
        const onKey = (e: globalThis.KeyboardEvent) => {
            if (e.key === "/" && !e.metaKey && !e.ctrlKey && !isTypingTarget(e.target)) {
                e.preventDefault();
                inputRef.current?.focus();
                setOpen(true);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    useEffect(() => {
        if (!canSearchUsers || term.length < 2) {
            setPeople((p) => ({ ...p, users: [] }));
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setLoading(true);
            setPeopleError(null);
            try {
                const res = await fetch(`/search/users?q=${encodeURIComponent(term)}`, {
                    headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
                    credentials: "same-origin",
                    signal: controller.signal,
                });
                if (!res.ok) throw new Error(res.status === 429 ? "Too many searches, slow down a moment." : "Couldn't search people right now.");
                setPeople(await res.json());
            } catch (e) {
                if (!controller.signal.aborted) setPeopleError(e instanceof Error ? e.message : "Couldn't search people right now.");
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, DEBOUNCE_MS);

        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [term, canSearchUsers, refreshKey]);

    useEffect(() => setActiveIndex(0), [query]);

    const close = () => {
        setOpen(false);
        setNotice(null);
    };

    const goTo = (path: string) => {
        close();
        setQuery("");
        inputRef.current?.blur();
        router.visit(path);
        onDone?.();
    };

    const applyChange = () => {
        if (!pending) return;
        const { user: target, change } = pending;
        setPending(null);

        const [url, data] =
            change.kind === "role"
                ? [`/superadmin/settings/users/${target.id}/role`, { role_id: change.roleId }]
                : [`/superadmin/settings/users/${target.id}/status`, { status: change.status }];

        router.put(url, data, {
            preserveScroll: true,
            preserveState: true,
            onStart: () => setSaving(true),
            onFinish: () => setSaving(false),
            onSuccess: () => {
                setNotice({
                    tone: "success",
                    text:
                        change.kind === "role"
                            ? `${target.name} is now a ${change.label}.`
                            : `${target.name} is now ${STATUS_LABELS[change.status]}.`,
                });
                setRefreshKey((k) => k + 1);
            },
            onError: (errors) =>
                setNotice({ tone: "error", text: errors.role ?? errors.status ?? errors.role_id ?? "That change wasn't saved." }),
        });
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Escape") {
            close();
            inputRef.current?.blur();
            return;
        }
        if (!items.length) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActiveIndex((i) => (i + 1) % items.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => (i - 1 + items.length) % items.length);
        } else if (e.key === "Enter") {
            const item = items[activeIndex];
            if (item?.type === "page") goTo(item.page.path);
        }
    };

    const confirmText = (() => {
        if (!pending) return { title: "", message: "", label: "" };
        const { user: target, change } = pending;
        if (change.kind === "role") {
            return {
                title: `Make ${target.name} a ${change.label}?`,
                message: `They will be moved from ${target.role_label ?? "no role"} to ${change.label} and get its permissions.`,
                label: `Move to ${change.label}`,
            };
        }
        const label = STATUS_LABELS[change.status];
        return {
            title: `Mark ${target.name} as ${label}?`,
            message:
                change.status === "active"
                    ? "They will be able to sign in again."
                    : "They will be signed out and can't sign in. Their records stay in the portal.",
            label: `Mark as ${label}`,
        };
    })();

    const showPanel = open && term.length > 0;
    const nothingFound = !loading && !peopleError && items.length === 0 && (term.length >= 2 || !canSearchUsers);

    return (
        <ClickAwayListener
            onClickAway={(e) => {
                // Role/status menus and the confirm dialog are portalled outside this box; clicks in them aren't "away".
                if (pending || (e.target instanceof Element && e.target.closest(".MuiPopover-root, .MuiDialog-root"))) return;
                close();
            }}
        >
            <Box sx={{ width: "100%", maxWidth: 720 }}>
                <Box
                    ref={anchorRef}
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        px: 2,
                        py: 0.75,
                        borderRadius: 99,
                        backgroundColor: showPanel ? "var(--lr-surface)" : "var(--lr-surface-container)",
                        boxShadow: showPanel ? "0 1px 3px rgba(60,64,67,.2)" : "none",
                        transition: "background-color 0.15s, box-shadow 0.15s",
                        ":focus-within": { backgroundColor: "var(--lr-surface)", boxShadow: "0 1px 3px rgba(60,64,67,.2)" },
                    }}
                >
                    {loading ? (
                        <CircularProgress size={18} sx={{ color: "var(--lr-text-secondary)" }} />
                    ) : (
                        <SearchRounded sx={{ color: "var(--lr-text-secondary)" }} fontSize="small" />
                    )}
                    <InputBase
                        inputRef={inputRef}
                        fullWidth
                        autoFocus={autoFocus}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setOpen(true);
                            setNotice(null);
                        }}
                        onFocus={() => setOpen(true)}
                        onKeyDown={handleKeyDown}
                        placeholder={canSearchUsers ? "Search (/) pages and people" : "Search (/) pages"}
                        inputProps={{
                            "aria-label": "Search",
                            role: "combobox",
                            "aria-expanded": showPanel,
                            "aria-controls": "global-search-results",
                            "aria-autocomplete": "list",
                        }}
                        sx={{
                            fontSize: 15,
                            color: "var(--lr-text-body)",
                            "& .MuiInputBase-input::placeholder": { color: "var(--lr-text-secondary)", opacity: 1 },
                        }}
                    />
                </Box>

                <Popper
                    open={showPanel}
                    anchorEl={anchorRef.current}
                    placement="bottom-start"
                    disablePortal
                    sx={{ zIndex: 1300, width: anchorRef.current?.offsetWidth ?? "100%", minWidth: { sm: 420 } }}
                >
                    <Paper
                        id="global-search-results"
                        role="listbox"
                        elevation={0}
                        sx={{
                            mt: 1,
                            maxHeight: "70vh",
                            overflowY: "auto",
                            borderRadius: 3,
                            border: "1px solid var(--lr-border)",
                            boxShadow: "0 4px 16px rgba(0,0,0,.12)",
                            backgroundColor: "var(--lr-surface)",
                            pb: 1,
                        }}
                    >
                        {notice && (
                            <Box
                                role={notice.tone === "error" ? "alert" : "status"}
                                sx={{
                                    m: 1,
                                    px: 1.5,
                                    py: 1,
                                    borderRadius: 2,
                                    color: notice.tone === "error" ? "var(--lr-error)" : "var(--lr-success)",
                                    backgroundColor: notice.tone === "error" ? "var(--lr-error-soft)" : "var(--lr-success-soft)",
                                }}
                            >
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {notice.text}
                                </Typography>
                            </Box>
                        )}

                        {pages.length > 0 && (
                            <>
                                <SectionLabel>PAGES</SectionLabel>
                                {pages.map((page, i) => {
                                    const Icon = page.icon;
                                    return (
                                        <Box
                                            key={page.path}
                                            role="option"
                                            aria-selected={activeIndex === i}
                                            onMouseEnter={() => setActiveIndex(i)}
                                            onClick={() => goTo(page.path)}
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1.5,
                                                px: 2,
                                                py: 1,
                                                cursor: "pointer",
                                                backgroundColor: activeIndex === i ? "var(--lr-surface-container)" : "transparent",
                                            }}
                                        >
                                            {Icon && <Icon fontSize="small" sx={{ color: "var(--lr-text-secondary)" }} />}
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="body2" sx={{ color: "var(--lr-text-primary)" }}>
                                                    {page.name}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                                                    {page.trail ? `${page.trail} · ` : ""}
                                                    {page.path}
                                                </Typography>
                                            </Box>
                                            <NorthEastRounded sx={{ fontSize: 16, color: "var(--lr-text-secondary)" }} />
                                        </Box>
                                    );
                                })}
                            </>
                        )}

                        {canSearchUsers && term.length >= 2 && (people.users.length > 0 || peopleError) && (
                            <>
                                <SectionLabel>PEOPLE</SectionLabel>
                                {peopleError && (
                                    <Typography variant="body2" sx={{ px: 2, py: 1, color: "var(--lr-error)" }}>
                                        {peopleError}
                                    </Typography>
                                )}
                                {people.users.map((u, i) => (
                                    <UserSearchResult
                                        key={u.id}
                                        user={u}
                                        active={activeIndex === pages.length + i}
                                        isSelf={u.id === user?.id}
                                        canManage={canManage}
                                        busy={saving}
                                        roles={people.roles}
                                        statuses={people.statuses}
                                        onChange={(target, change) => setPending({ user: target, change })}
                                        onHover={() => setActiveIndex(pages.length + i)}
                                    />
                                ))}
                            </>
                        )}

                        {canSearchUsers && term.length === 1 && pages.length === 0 && (
                            <Typography variant="body2" sx={{ px: 2, pt: 1.5, color: "var(--lr-text-secondary)" }}>
                                Keep typing to search people…
                            </Typography>
                        )}

                        {nothingFound && (
                            <Typography variant="body2" sx={{ px: 2, pt: 1.5, color: "var(--lr-text-secondary)" }}>
                                No pages{canSearchUsers ? " or people" : ""} match “{term}”.
                            </Typography>
                        )}
                    </Paper>
                </Popper>

                <ConfirmDialog
                    open={pending !== null}
                    title={confirmText.title}
                    message={confirmText.message}
                    confirmLabel={confirmText.label}
                    tone={pending?.change.kind === "status" && pending.change.status !== "active" ? "danger" : "primary"}
                    onConfirm={applyChange}
                    onClose={() => setPending(null)}
                />
            </Box>
        </ClickAwayListener>
    );
}
