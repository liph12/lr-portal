import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Box, CircularProgress, ClickAwayListener, InputBase, Paper, Popper, Typography } from "@mui/material";
import { NorthEastRounded, SearchRounded } from "@mui/icons-material";
import { router } from "@inertiajs/react";
import useAuthUser from "../../../hooks/useAuthUser";
import usePortalRoutes from "../../../hooks/usePortalRoutes";
import { buildPageIndex, PageResult, searchPages } from "../../../helpers/searchPages";
import ConfirmDialog from "../ConfirmDialog";
import UserSearchResult, { UserSearchItem } from "./UserSearchResult";
import GroupSearchResult, { GroupSearchItem } from "./GroupSearchResult";

interface GlobalSearchProps {
    autoFocus?: boolean;
    // Called after navigating away, e.g. so the mobile overlay can close itself.
    onDone?: () => void;
}

interface UserSearchResponse {
    users: UserSearchItem[];
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
    const canSearchGroups = !!user?.can.search_groups;
    const canSearchRemote = canSearchUsers || canSearchGroups;

    const anchorRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [people, setPeople] = useState<UserSearchResponse>({ users: [] });
    const [groups, setGroups] = useState<GroupSearchItem[]>([]);
    const [peopleError, setPeopleError] = useState<string | null>(null);
    const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
    // The person a superadmin is about to sign in as (confirmed first).
    const [pending, setPending] = useState<UserSearchItem | null>(null);

    const portalRoutes = usePortalRoutes();
    const pageIndex = useMemo(() => buildPageIndex(portalRoutes), [portalRoutes]);
    const pages = useMemo(() => searchPages(pageIndex, query), [pageIndex, query]);
    const term = query.trim();
    const items: ({ type: "page"; page: PageResult } | { type: "group"; group: GroupSearchItem } | { type: "user"; user: UserSearchItem })[] = [
        ...pages.map((page) => ({ type: "page" as const, page })),
        ...groups.map((group) => ({ type: "group" as const, group })),
        ...people.users.map((u) => ({ type: "user" as const, user: u })),
    ];
    const usersOffset = pages.length + groups.length;

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
        if (!canSearchRemote || term.length < 2) {
            setPeople({ users: [] });
            setGroups([]);
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setLoading(true);
            setPeopleError(null);
            const get = async (url: string) => {
                const res = await fetch(`${url}?q=${encodeURIComponent(term)}`, {
                    headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
                    credentials: "same-origin",
                    signal: controller.signal,
                });
                if (!res.ok) throw new Error(res.status === 429 ? "Too many searches, slow down a moment." : "Couldn't search right now.");
                return res.json();
            };
            try {
                const [peopleResult, groupResult] = await Promise.all([
                    canSearchUsers ? get("/search/users") : null,
                    canSearchGroups ? get("/search/groups") : null,
                ]);
                setPeople(peopleResult ?? { users: [] });
                setGroups(groupResult?.groups ?? []);
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
    }, [term, canSearchUsers, canSearchGroups, canSearchRemote]);

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

    const signInAs = () => {
        if (!pending) return;
        const target = pending;
        setPending(null);
        router.post(`/impersonate/${target.id}`, {}, {
            onSuccess: () => {
                close();
                setQuery("");
                onDone?.();
            },
            onError: (errors) => setNotice({ tone: "error", text: errors.user ?? `Couldn't sign in as ${target.name}.` }),
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
            else if (item?.type === "group") goTo(item.group.url);
            else if (item?.type === "user" && item.user.agent_id) goTo(`/agents/${item.user.agent_id}`);
        }
    };

    const showPanel = open && term.length > 0;
    const nothingFound = !loading && !peopleError && items.length === 0 && (term.length >= 2 || !canSearchRemote);
    const searchesFor = ["pages", canSearchGroups && "teams, areas", canSearchUsers && "people"].filter(Boolean).join(", ");

    return (
        <ClickAwayListener
            onClickAway={(e) => {
                // The confirm dialog is portalled outside this box; clicks in it aren't "away".
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
                        placeholder={`Search (/) ${searchesFor.replace(/, ([^,]*)$/, " and $1")}`}
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

                        {groups.length > 0 && (
                            <>
                                <SectionLabel>TEAMS & AREAS</SectionLabel>
                                {groups.map((g, i) => (
                                    <GroupSearchResult
                                        key={`${g.type}-${g.id}`}
                                        group={g}
                                        active={activeIndex === pages.length + i}
                                        onHover={() => setActiveIndex(pages.length + i)}
                                        onOpen={goTo}
                                    />
                                ))}
                            </>
                        )}

                        {canSearchRemote && term.length >= 2 && peopleError && (
                            <Typography variant="body2" sx={{ px: 2, py: 1, color: "var(--lr-error)" }}>
                                {peopleError}
                            </Typography>
                        )}

                        {canSearchUsers && term.length >= 2 && people.users.length > 0 && (
                            <>
                                <SectionLabel>PEOPLE</SectionLabel>
                                {people.users.map((u, i) => (
                                    <UserSearchResult
                                        key={u.id}
                                        user={u}
                                        active={activeIndex === usersOffset + i}
                                        isSelf={u.id === user?.id}
                                        onHover={() => setActiveIndex(usersOffset + i)}
                                        onOpen={goTo}
                                        onSignInAs={setPending}
                                    />
                                ))}
                            </>
                        )}

                        {canSearchRemote && term.length === 1 && pages.length === 0 && (
                            <Typography variant="body2" sx={{ px: 2, pt: 1.5, color: "var(--lr-text-secondary)" }}>
                                Keep typing to search {canSearchUsers ? "people" : "teams and areas"}…
                            </Typography>
                        )}

                        {nothingFound && (
                            <Typography variant="body2" sx={{ px: 2, pt: 1.5, color: "var(--lr-text-secondary)" }}>
                                Nothing matches “{term}”.
                            </Typography>
                        )}
                    </Paper>
                </Popper>

                <ConfirmDialog
                    open={pending !== null}
                    title={`Sign in as ${pending?.name ?? ""}?`}
                    message="You'll see the portal exactly as they do. Everything you do is recorded as them and as you. Use the red banner to return to your own account."
                    confirmLabel="Sign in as them"
                    tone="primary"
                    onConfirm={signInAs}
                    onClose={() => setPending(null)}
                />
            </Box>
        </ClickAwayListener>
    );
}
