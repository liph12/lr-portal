import { Autocomplete, AutocompleteProps } from "@mui/material";

type Option = { id: number | string; label: string };

type StyledAutocompleteProps = AutocompleteProps<
    Option,
    false, // multiple
    false, // disableClearable
    false // freeSolo
>;

// MUI's Autocomplete with the theme's own popup, matching the Sales validation sale form; spread props, size small.
export default function StyledAutocomplete(props: StyledAutocompleteProps) {
    return <Autocomplete {...props} size="small" fullWidth disablePortal />;
}
