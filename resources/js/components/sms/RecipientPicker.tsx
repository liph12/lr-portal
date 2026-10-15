import { useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    ButtonBase,
    CircularProgress,
    IconButton,
    Tooltip,
    Typography,
} from "@mui/material";
import { CheckRounded, CloseRounded, SearchRounded } from "@mui/icons-material";
import { router } from "@inertiajs/react";
import { GridColDef } from "@mui/x-data-grid";
import FieldLabel from "../utils/forms/FieldLabel";
import StyledAutocomplete from "../utils/StyledAutocomplete";
import StyledTextField from "../utils/StyledTextField";
import StyledButton from "../utils/StyledButton";
import DataTable from "../utils/tables/DataTable";
import { formatCount } from "../../helpers/formatNumber";

export interface SmsGroup {
    role: string;
    label: string;
    count: number;
}

export interface SmsPerson {
    id: number;
    name: string;
    mobile: string;
    role: string;
    label: string;
}

interface RecipientPickerProps {
    groups: SmsGroup[];
    // Roles ticked (their people were added) and the people on the list.
    picked: string[];
    people: SmsPerson[];
    onChange: (people: SmsPerson[], picked: string[]) => void;
    // People found by the search box (the page's optional prop peopleOptions).
    options?: SmsPerson[];
    error?: string | null;
}

// Who gets the message: ticking a group (role) puts its people on the list — name, role, mobile — where anyone can be taken
// off, and the search adds people one by one. Each group's people are loaded once (partial reload of `members`).
export default function RecipientPicker({
    groups,
    picked,
    people,
    onChange,
    options,
    error,
}: RecipientPickerProps) {
    const loaded = useRef(new Map<string, SmsPerson[]>());
    const [loading, setLoading] = useState<string | null>(null);
    const [searching, setSearching] = useState(false);
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState("");
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
    useEffect(() => () => clearTimeout(timer.current), []);

    const add = (list: SmsPerson[], roles = picked) => {
        const ids = new Set(people.map((p) => p.id));
        onChange([...people, ...list.filter((p) => !ids.has(p.id))], roles);
    };
    const toggle = (role: string) => {
        if (picked.includes(role)) {
            onChange(
                people.filter((p) => p.role !== role),
                picked.filter((r) => r !== role),
            );
            return;
        }
        const cached = loaded.current.get(role);
        if (cached) return add(cached, [...picked, role]);
        setLoading(role);
        router.reload({
            only: ["members"],
            data: { members_role: role },
            preserveUrl: true,
            onSuccess: (page) => {
                const members = (
                    page.props as {
                        members?: { role: string; people: SmsPerson[] };
                    }
                ).members;
                if (members?.role !== role) return;
                loaded.current.set(role, members.people);
                add(members.people, [...picked, role]);
            },
            onFinish: () => setLoading(null),
        });
    };
    const search = (text: string) => {
        setQuery(text);
        clearTimeout(timer.current);
        if (text.trim().length < 2) return;
        timer.current = setTimeout(() => {
            setSearching(true);
            router.reload({
                only: ["peopleOptions"],
                data: { people_q: text.trim() },
                preserveUrl: true,
                async: true,
                onFinish: () => setSearching(false),
            });
        }, 300);
    };

    const shown = useMemo(() => {
        const q = filter.trim().toLowerCase();
        const digits = q.replace(/\D/g, "");
        return q
            ? people.filter(
                  (p) =>
                      p.name.toLowerCase().includes(q) ||
                      p.label.toLowerCase().includes(q) ||
                      (digits.length >= 3 && p.mobile.includes(digits)),
              )
            : people;
    }, [people, filter]);
    const onList = new Set(people.map((p) => p.id));
    const found = (options ?? []).filter((p) => !onList.has(p.id));

    const columns: GridColDef<SmsPerson>[] = [
        { field: "name", headerName: "Name", flex: 1, minWidth: 180 },
        { field: "label", headerName: "Role", width: 150 },
        { field: "mobile", headerName: "Mobile", width: 140 },
        {
            field: "remove",
            headerName: "",
            width: 56,
            sortable: false,
            renderCell: ({ row }) => (
                <Tooltip title={`Remove ${row.name}`}>
                    <IconButton
                        size="small"
                        aria-label={`Remove ${row.name}`}
                        onClick={() =>
                            onChange(
                                people.filter((p) => p.id !== row.id),
                                picked,
                            )
                        }
                        sx={{
                            color: "var(--lr-text-secondary)",
                            ":hover": { color: "var(--lr-error)" },
                        }}
                    >
                        <CloseRounded fontSize="small" />
                    </IconButton>
                </Tooltip>
            ),
        },
    ];

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box>
                <FieldLabel text="Add whole groups" />
                {groups.length ? (
                    <Box
                        role="group"
                        aria-label="Groups"
                        sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}
                    >
                        {groups.map((g) => {
                            const selected = picked.includes(g.role);
                            return (
                                <ButtonBase
                                    key={g.role}
                                    role="checkbox"
                                    aria-checked={selected}
                                    disabled={loading !== null}
                                    onClick={() => toggle(g.role)}
                                    sx={{
                                        gap: 1,
                                        px: 1.5,
                                        py: 1,
                                        borderRadius: 99,
                                        border: "1.5px solid",
                                        borderColor: selected
                                            ? "var(--lr-primary)"
                                            : "var(--lr-border)",
                                        backgroundColor: selected
                                            ? "var(--lr-primary-soft)"
                                            : "var(--lr-surface)",
                                        color: selected
                                            ? "var(--lr-primary)"
                                            : "var(--lr-text-body)",
                                        fontSize: 14,
                                        fontWeight: selected ? 600 : 500,
                                        ":hover": {
                                            borderColor: "var(--lr-primary)",
                                        },
                                        ":focus-visible": {
                                            outline:
                                                "2px solid var(--lr-primary)",
                                            outlineOffset: 2,
                                        },
                                    }}
                                >
                                    {loading === g.role ? (
                                        <CircularProgress
                                            size={14}
                                            sx={{ color: "var(--lr-primary)" }}
                                        />
                                    ) : (
                                        selected && (
                                            <CheckRounded
                                                sx={{ fontSize: 17 }}
                                            />
                                        )
                                    )}
                                    {g.label}
                                    <Box
                                        component="span"
                                        sx={{
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: "var(--lr-text-secondary)",
                                        }}
                                    >
                                        {formatCount(g.count)}
                                    </Box>
                                </ButtonBase>
                            );
                        })}
                    </Box>
                ) : (
                    <Typography
                        variant="body2"
                        sx={{ color: "var(--lr-text-secondary)" }}
                    >
                        No groups to send to: you don't lead a team or sub-team
                        with mobile numbers on record.
                    </Typography>
                )}
            </Box>

            <Box>
                <FieldLabel text="Add a person" />
                <StyledAutocomplete
                    options={found.map((p) => ({ id: p.id, label: p.name }))}
                    value={null}
                    inputValue={query}
                    onInputChange={(_, text, reason) =>
                        reason === "input" && search(text)
                    }
                    onChange={(_, option) => {
                        const person =
                            option && found.find((p) => p.id === option.id);
                        if (person) add([person]);
                        setQuery("");
                    }}
                    filterOptions={(o) => o}
                    loading={searching}
                    noOptionsText={
                        query.trim().length < 2
                            ? "Type a name, email or mobile number"
                            : searching
                              ? "Searching…"
                              : "No one found"
                    }
                    renderOption={({ key, ...props }, o) => {
                        const p = found.find((x) => x.id === o.id);
                        return (
                            <Box
                                component="li"
                                key={`${key}-${o.id}`}
                                {...props}
                                sx={{ display: "block !important" }}
                            >
                                <Typography
                                    variant="body2"
                                    sx={{ color: "var(--lr-text-primary)" }}
                                >
                                    {o.label}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{ color: "var(--lr-text-secondary)" }}
                                >
                                    {p?.label} · {p?.mobile}
                                </Typography>
                            </Box>
                        );
                    }}
                    renderInput={(params) => (
                        <StyledTextField
                            params={params}
                            name="person"
                            placeholder="Search by name, email or mobile number"
                        />
                    )}
                />
            </Box>

            <Box>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        mb: 1,
                        flexWrap: "wrap",
                    }}
                >
                    <Typography
                        sx={{
                            fontWeight: people.length ? 600 : 400,
                            color: people.length
                                ? "var(--lr-text-primary)"
                                : "var(--lr-text-secondary)",
                        }}
                    >
                        {people.length
                            ? `${formatCount(people.length)} ${people.length === 1 ? "person" : "people"} on the list`
                            : "No one on the list yet — add a group or a person above."}
                    </Typography>
                    {people.length > 0 && (
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                            }}
                        >
                            <Box sx={{ width: { xs: 160, sm: 220 } }}>
                                <StyledTextField
                                    name="filter"
                                    value={filter}
                                    handleChange={(e) =>
                                        setFilter(e.target.value)
                                    }
                                    placeholder="Find on the list"
                                    props={{
                                        size: "small",
                                        slotProps: {
                                            input: {
                                                startAdornment: (
                                                    <SearchRounded
                                                        sx={{
                                                            fontSize: 18,
                                                            mr: 0.5,
                                                            color: "var(--lr-text-secondary)",
                                                        }}
                                                    />
                                                ),
                                            },
                                        },
                                    }}
                                />
                            </Box>
                            <StyledButton
                                size="small"
                                onClick={() => onChange([], [])}
                                sx={{ color: "var(--lr-error)" }}
                            >
                                Remove all
                            </StyledButton>
                        </Box>
                    )}
                </Box>
                {people.length > 0 && (
                    <DataTable
                        rows={shown}
                        columns={columns}
                        getRowId={(r) => r.id}
                        density="compact"
                        initialState={{
                            pagination: { paginationModel: { pageSize: 10 } },
                        }}
                        pageSizeOptions={[10, 25, 50, 100]}
                        disableRowSelectionOnClick
                        aria-label="People on the list"
                    />
                )}
                {error && (
                    <Typography
                        variant="caption"
                        sx={{
                            display: "block",
                            mt: 1,
                            color: "var(--lr-error)",
                        }}
                    >
                        {error}
                    </Typography>
                )}
            </Box>
        </Box>
    );
}
