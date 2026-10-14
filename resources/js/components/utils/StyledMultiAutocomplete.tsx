import { Autocomplete, AutocompleteProps, Chip } from "@mui/material";
import StyledTextField from "./StyledTextField";

type StyledMultiAutocompleteProps = Omit<AutocompleteProps<string, true, false, true>, "renderInput" | "multiple" | "freeSolo"> & {
    name: string;
    placeholder?: string;
    error?: string | null;
};

// StyledAutocomplete for several values: pick from the list or type your own (Enter), shown as chips.
export default function StyledMultiAutocomplete({ name, placeholder, error = null, ...props }: StyledMultiAutocompleteProps) {
    return (
        <Autocomplete
            {...props}
            multiple
            freeSolo
            size="small"
            fullWidth
            disablePortal
            renderValue={(values, getItemProps) =>
                values.map((v, i) => {
                    const { key, ...item } = getItemProps({ index: i });
                    return <Chip key={key} {...item} label={v} size="small" sx={{ maxWidth: "100%", backgroundColor: "var(--lr-primary-soft)", color: "var(--lr-primary)" }} />;
                })
            }
            renderInput={(params) => <StyledTextField params={params} name={name} placeholder={props.value && props.value.length ? undefined : placeholder} error={error} />}
            slotProps={{
                paper: { sx: { borderRadius: 0 } },
                listbox: {
                    sx: {
                        "& .MuiAutocomplete-option": { fontSize: "0.8rem", minHeight: 32, paddingY: 0.5 },
                        "& .MuiAutocomplete-option.Mui-focused": { backgroundColor: "var(--lr-surface-hover)" },
                        "& .MuiAutocomplete-option[aria-selected='true']": { backgroundColor: "var(--lr-primary-soft)", fontWeight: "bold", color: "var(--lr-primary)" },
                    },
                },
            }}
        />
    );
}
