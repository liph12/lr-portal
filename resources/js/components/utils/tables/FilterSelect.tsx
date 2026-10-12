import { MenuItem, TextField } from "@mui/material";

interface FilterSelectProps {
    label: string;
    value: string | number | null | undefined;
    options: { value: string | number; label: string }[];
    onChange: (value: string) => void;
    // Filters with a default of their own (e.g. "With a team") list every choice instead of an "All …" entry.
    hideAll?: boolean;
}

// A compact "All …" dropdown for table toolbars.
export default function FilterSelect({ label, value, options, onChange, hideAll = false }: FilterSelectProps) {
    return (
        <TextField
            select
            size="small"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            slotProps={{ select: { displayEmpty: true }, htmlInput: { "aria-label": label } }}
            sx={{
                minWidth: 160,
                "& .MuiOutlinedInput-root": { borderRadius: 99, backgroundColor: "var(--lr-surface-container)", fontSize: 14 },
                "& fieldset": { border: "none" },
            }}
        >
            {!hideAll && <MenuItem value="">All {label.toLowerCase()}</MenuItem>}
            {options.map((o) => (
                <MenuItem key={o.value} value={o.value} sx={{ textTransform: "capitalize" }}>
                    {o.label}
                </MenuItem>
            ))}
        </TextField>
    );
}
