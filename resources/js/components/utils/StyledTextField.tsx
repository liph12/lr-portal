import React from "react";
import { TextField, TextFieldProps } from "@mui/material";
import { AutocompleteRenderInputParams } from "@mui/material/Autocomplete";

interface CustomTextFieldProps {
    props?: TextFieldProps;
    params?: AutocompleteRenderInputParams;
    type?: string;
    value?: string;
    placeholder?: string;
    name: string;
    error?: string | null;
    // Floating label inside the outline (as in Sales validation); forms that print their own label above leave it out.
    label?: string;
    required?: boolean;
    handleChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// The app's text input: MUI's outlined field on the theme (providers/appTheme.ts), the same as the Sales validation
// sale form, with the error in its helper text.
export default function StyledTextField({
    props,
    params,
    type = "text",
    value,
    placeholder,
    name,
    error = null,
    label,
    required,
    handleChange,
}: CustomTextFieldProps) {
    return (
        <TextField
            {...params}
            {...props}
            size="small"
            fullWidth
            autoComplete="off"
            onChange={handleChange ?? props?.onChange}
            type={type}
            label={label}
            required={required}
            placeholder={placeholder}
            name={name}
            value={value}
            error={!!error}
            helperText={error ?? props?.helperText}
            sx={{
                "& .MuiInputBase-input": { color: "var(--lr-text-primary)", fontSize: 14 },
                "& .MuiInputBase-input::placeholder": { color: "var(--lr-text-secondary)", opacity: 1 },
                "& .MuiFormHelperText-root": { mx: 0.5 },
                ...props?.sx,
            }}
        />
    );
}
