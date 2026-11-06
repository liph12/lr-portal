import { FormEvent, useState } from "react";
import { Box, IconButton, InputAdornment, Typography } from "@mui/material";
import { VisibilityOffRounded, VisibilityRounded } from "@mui/icons-material";
import { useForm } from "@inertiajs/react";
import AuthShell from "../../../components/layouts/AuthShell";
import StyledButton from "../../../components/utils/StyledButton";
import StyledTextField from "../../../components/utils/StyledTextField";
import FieldLabel from "../../../components/utils/forms/FieldLabel";

interface CreatePasswordProps {
    email: string;
}

const primarySx = {
    backgroundColor: "var(--lr-primary)",
    color: "var(--lr-on-primary)",
    ":hover": { backgroundColor: "var(--lr-primary-hover)" },
    "&.Mui-disabled": { backgroundColor: "var(--lr-surface-container)", color: "var(--lr-text-secondary)" },
};

// Last step of forgot-password, reached only once the email was confirmed (PasswordResetController::newPassword).
function CreatePassword({ email }: CreatePasswordProps) {
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors } = useForm({ password: "", password_confirmation: "" });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post("/password-reset/new");
    };

    return (
        <AuthShell>
            <Typography sx={{ fontSize: 28, color: "var(--lr-text-primary)" }}>Set a new password</Typography>
            <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", mt: 0.5, mb: 3 }}>
                For <strong>{email}</strong>. Use at least 8 characters, with letters and numbers.
            </Typography>

            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box>
                    <FieldLabel text="New password" required />
                    <StyledTextField
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="New password"
                        value={data.password}
                        error={errors.password ?? null}
                        handleChange={(e) => setData("password", e.target.value)}
                        props={{
                            slotProps: {
                                input: {
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                size="small"
                                                edge="end"
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                                onClick={() => setShowPassword((s) => !s)}
                                                sx={{ color: "var(--lr-text-secondary)" }}
                                            >
                                                {showPassword ? <VisibilityOffRounded fontSize="small" /> : <VisibilityRounded fontSize="small" />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                },
                            },
                        }}
                    />
                </Box>
                <Box>
                    <FieldLabel text="Confirm new password" required />
                    <StyledTextField
                        name="password_confirmation"
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        value={data.password_confirmation}
                        error={errors.password_confirmation ?? null}
                        handleChange={(e) => setData("password_confirmation", e.target.value)}
                    />
                </Box>
                <StyledButton type="submit" variant="contained" loading={processing} disabled={!data.password || !data.password_confirmation} sx={primarySx}>
                    Set new password
                </StyledButton>
            </Box>
        </AuthShell>
    );
}

export default CreatePassword;
