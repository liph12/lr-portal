import { ChangeEvent, FormEvent } from "react";
import { Box, FormHelperText, Grid } from "@mui/material";
import { useForm } from "@inertiajs/react";
import StyledTextField from "../StyledTextField";
import StyledButton from "../StyledButton";

interface PasswordFields {
    current_password: string;
    password: string;
    password_confirmation: string;
}

const labelSx = { color: "var(--lr-text-secondary)", fontWeight: 500, mb: 0.5, ml: 0.5 };

const FIELDS: { name: keyof PasswordFields; label: string; autoComplete: string }[] = [
    { name: "current_password", label: "Current Password", autoComplete: "current-password" },
    { name: "password", label: "New Password", autoComplete: "new-password" },
    { name: "password_confirmation", label: "Confirm New Password", autoComplete: "new-password" },
];

export default function ChangePasswordForm() {
    const form = useForm<PasswordFields>({
        current_password: "",
        password: "",
        password_confirmation: "",
    });

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const key = e.target.name as keyof PasswordFields;
        form.setData(key, e.target.value);
        if (form.errors[key]) form.clearErrors(key);
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.post("/profile/password", {
            preserveScroll: true,
            onSuccess: () => form.reset(),
            onError: () => form.reset("current_password", "password", "password_confirmation"),
        });
    };

    return (
        <Box component="form" onSubmit={handleSubmit} noValidate>
            <Grid container spacing={2}>
                {FIELDS.map((f) => (
                    <Grid key={f.name} size={{ xs: 12, md: 4 }}>
                        <FormHelperText sx={labelSx}>{f.label}</FormHelperText>
                        <StyledTextField
                            name={f.name}
                            type="password"
                            value={form.data[f.name]}
                            error={form.errors[f.name] ?? null}
                            handleChange={handleChange}
                            props={{ slotProps: { htmlInput: { autoComplete: f.autoComplete } } }}
                        />
                    </Grid>
                ))}
            </Grid>
            <FormHelperText sx={{ ml: 0.5, mt: 1, color: "var(--lr-text-secondary)" }}>
                At least 8 characters, with letters and numbers.
            </FormHelperText>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                <StyledButton
                    type="submit"
                    variant="contained"
                    loading={form.processing}
                    disabled={!form.data.current_password || !form.data.password}
                    sx={{ px: 3, backgroundColor: "var(--lr-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } }}
                >
                    Update password
                </StyledButton>
            </Box>
        </Box>
    );
}
