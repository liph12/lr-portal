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
                    backgroundColor: "#f1f3f4",
                    border: error
                        ? "1px solid #d93025"
                        : "1px solid transparent",
                    transition:
                        "background-color 0.15s, border-color 0.15s, box-shadow 0.15s",
                    ":hover": {
                        backgroundColor: error ? "#f1f3f4" : "#e8eaed",
                    },
                    ":focus-within": {
                        backgroundColor: "#fff",
                        borderColor: error ? "#d93025" : "#1a73e8",
                        boxShadow: error
                            ? "0 0 0 2px rgba(217,48,37,.15)"
                            : "0 0 0 2px rgba(26,115,232,.15)",
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
                                color: "#202124",
                                fontSize: 14,
                                "&::placeholder": {
                                    color: "#5f6368",
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
                    sx={{ color: "#d93025", mt: 0.5, ml: 0.5 }}
                >
                    {error}
                </Typography>
            )}
        </>
    );
}
