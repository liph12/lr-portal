import { TextFieldProps, TextField } from "@mui/material";

export default function StyledTextFieldPrimary(props: TextFieldProps) {
    return (
        <TextField
            {...props}
            sx={{
                "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                        mr: 1,
                        borderRadius: 0,
                    },
                    "& .MuiInputBase-input": {
                        color: "#333",
                        fontSize: 14,
                    },
                },
            }}
        />
    );
}
