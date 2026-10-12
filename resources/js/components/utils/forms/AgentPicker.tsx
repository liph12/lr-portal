import { useEffect, useState } from "react";
import { Autocomplete, Box, Typography } from "@mui/material";
import StyledTextField from "../StyledTextField";
import UserAvatar from "../user/UserAvatar";
import { AgentOption } from "../../../types/app-data-types";

interface AgentPickerProps {
    name: string;
    value: AgentOption | null;
    onChange: (agent: AgentOption | null) => void;
    error?: string | null;
    placeholder?: string;
    // Already chosen elsewhere on the form, so it isn't offered twice.
    exclude?: number | null;
    // Another sanctioned typeahead returning `{agents}` (e.g. /genealogy/search); extra query params ride along.
    searchUrl?: string;
    params?: Record<string, string>;
    // The line under the name (default: email).
    describe?: (agent: AgentOption) => string | null | undefined;
}

const DEBOUNCE_MS = 250;

// ~83k agents: searched on the server as you type (GET /search/agents) rather than sent as a list.
export default function AgentPicker({ name, value, onChange, error, placeholder = "Search agent by name or email", exclude, searchUrl = "/search/agents", params, describe = (o) => o.email }: AgentPickerProps) {
    const [input, setInput] = useState("");
    const [options, setOptions] = useState<AgentOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const term = input.trim();
    const query = new URLSearchParams({ ...params, q: term }).toString();

    useEffect(() => {
        if (term.length < 2 || term === value?.name) {
            setOptions([]);
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setLoading(true);
            setFetchError(null);
            try {
                const res = await fetch(`${searchUrl}?${query}`, {
                    headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
                    credentials: "same-origin",
                    signal: controller.signal,
                });
                if (!res.ok) throw new Error(res.status === 429 ? "Too many searches, slow down a moment." : "Couldn't search agents right now.");
                setOptions((await res.json()).agents);
            } catch (e) {
                if (!controller.signal.aborted) setFetchError(e instanceof Error ? e.message : "Couldn't search agents right now.");
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, DEBOUNCE_MS);

        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [term, value?.name, searchUrl, query]);

    return (
        <Autocomplete
            size="small"
            fullWidth
            disablePortal
            value={value}
            options={options.filter((o) => o.id !== exclude)}
            loading={loading}
            // The server already matched; don't filter again in the browser.
            filterOptions={(o) => o}
            getOptionLabel={(o) => o.name}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            noOptionsText={fetchError ?? (term.length < 2 ? "Type at least 2 letters" : "No matching agent")}
            onInputChange={(_, v) => setInput(v)}
            onChange={(_, v) => onChange(v)}
            renderOption={({ key, ...props }, o) => (
                <Box component="li" key={key} {...props} sx={{ display: "flex", gap: 1.25, alignItems: "center" }}>
                    <UserAvatar name={o.name} src={o.avatar} size={26} />
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontSize: 13, color: "var(--lr-text-primary)" }}>
                            {o.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                            {describe(o)}
                        </Typography>
                    </Box>
                </Box>
            )}
            renderInput={(params) => <StyledTextField params={params} name={name} placeholder={placeholder} error={error ?? null} />}
        />
    );
}
