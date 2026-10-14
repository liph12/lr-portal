import React from "react";
import { Box, TextField, Typography, TextFieldProps } from "@mui/material";
import { AutocompleteRenderInputParams } from "@mui/material/Autocomplete";

interface CustomTextFieldProps {
    props?: TextFieldProps;
    params?: AutocompleteRenderInputParams;
    type?: string;
    value?: string;
    placeholder?: string;
    name: string;
    error?: string | null;
    handleChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function StyledTextField({
    props,
    params,
    type = "text",
    value,
    placeholder,
    name,
    error = null,
    handleChange,
}: CustomTextFieldProps) {
    return (
        <>
            <Box
                sx={{
                    display: "flex",
                    borderRadius: 2,
                    backgroundColor: "var(--lr-surface-container)",
                    border: error
                        ? "1px solid var(--lr-error)"
                        : "1px solid transparent",
                    transition:
                        "background-color 0.15s, border-color 0.15s, box-shadow 0.15s",
                    ":hover": {
                        backgroundColor: error ? "var(--lr-surface-container)" : "var(--lr-surface-hover)",
                    },
                    ":focus-within": {
                        backgroundColor: "var(--lr-surface)",
                        borderColor: error ? "var(--lr-error)" : "var(--lr-primary)",
                        boxShadow: error
                            ? "0 0 0 3px color-mix(in srgb, var(--lr-error) 18%, transparent)"
                            : "0 0 0 3px color-mix(in srgb, var(--lr-primary) 18%, transparent)",
                    },
                }}
            >
                <TextField
                    {...params}
                    {...props}
                    size="small"
                    fullWidth
                    autoComplete="off"
                    onChange={handleChange}
                    type={type}
                    placeholder={placeholder}
                    name={name}
                    value={value}
                    sx={{
                        "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            "& fieldset": {
                                border: "none",
                            },
                            "& .MuiInputBase-input": {
                                color: "var(--lr-text-primary)",
                                fontSize: 14,
                                "&::placeholder": {
                                    color: "var(--lr-text-secondary)",
                                    opacity: 1,
                                },
                            },
                        },
                    }}
                />
            </Box>
            {error && (
                <Typography
                    variant="caption"
                    component="div"
                    sx={{ color: "var(--lr-error)", mt: 0.5, ml: 0.5 }}
                >
                    {error}
                </Typography>
            )}
        </>
    );
}
