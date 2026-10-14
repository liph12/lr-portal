import { Autocomplete, Box, TextField, Typography } from "@mui/material";

export interface FilterOption {
    value: number;
    label: string;
    secondary?: string | null;
}

interface FilterAutocompleteProps {
    label: string;
    value: FilterOption | null;
    options: FilterOption[];
    onChange: (option: FilterOption | null) => void;
    // Server-searched choices (typed text → new options); without it the given options are filtered in the browser.
    onSearch?: (text: string) => void;
    loading?: boolean;
    width?: number;
}

// FilterSelect's searchable sibling, for long lists (sub-teams) or choices searched on the server (people).
export default function FilterAutocomplete({ label, value, options, onChange, onSearch, loading, width = 220 }: FilterAutocompleteProps) {
    return (
        <Autocomplete
            size="small"
            value={value}
            options={value && !options.some((o) => o.value === value.value) ? [value, ...options] : options}
            onChange={(_, option) => onChange(option)}
            onInputChange={(_, text, reason) => reason === "input" && onSearch?.(text)}
            filterOptions={onSearch ? (o) => o : undefined}
            isOptionEqualToValue={(a, b) => a.value === b.value}
            getOptionLabel={(o) => o.label}
            loading={loading}
            noOptionsText={onSearch ? "Type at least 2 letters" : "No matches"}
            renderOption={({ key, ...props }, o) => (
                <Box component="li" key={`${key}-${o.value}`} {...props} sx={{ display: "block !important" }}>
                    <Typography variant="body2" sx={{ color: "var(--lr-text-primary)" }}>
                        {o.label}
                    </Typography>
                    {o.secondary && (
                        <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                            {o.secondary}
                        </Typography>
                    )}
                </Box>
            )}
            renderInput={(params) => <TextField {...params} placeholder={`All ${label.toLowerCase()}`} slotProps={{ htmlInput: { ...params.inputProps, "aria-label": label } }} />}
            sx={{
                width: { xs: "100%", sm: width },
                "& .MuiOutlinedInput-root": { borderRadius: 99, backgroundColor: "var(--lr-surface-container)", fontSize: 14, pl: 1.5 },
                "& fieldset": { border: "none" },
            }}
        />
    );
}
