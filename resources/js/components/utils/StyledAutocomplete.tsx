import { Autocomplete, AutocompleteProps } from "@mui/material";

type Option = string;

type StyledAutocompleteProps = AutocompleteProps<
    Option,
    false, // multiple
    false, // disableClearable
    false // freeSolo
>;

export default function StyledAutocomplete(props: StyledAutocompleteProps) {
    return (
        <Autocomplete
            {...props}
            size="small"
            fullWidth
            disablePortal
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: 0,
                    },
                },
                listbox: {
                    sx: {
                        "& .MuiAutocomplete-option": {
                            fontSize: "0.8rem",
                            minHeight: 32,
                            paddingY: 0.5,
                        },
                        "& .MuiAutocomplete-option.Mui-focused": {
                            backgroundColor: "rgba(15, 48, 81, 0.12)",
                        },
                        "& .MuiAutocomplete-option[aria-selected='true']": {
                            backgroundColor: "rgba(46, 135, 224, 0.1)",
                            fontWeight: "bold",
                            color: "rgb(37, 106, 174)",
                        },
                    },
                },
            }}
        />
    );
}
