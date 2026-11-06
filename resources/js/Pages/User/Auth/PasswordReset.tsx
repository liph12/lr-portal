import { FormEvent } from "react";
import { Box, FormHelperText, Typography } from "@mui/material";
import { MarkEmailReadRounded } from "@mui/icons-material";
import { useForm } from "@inertiajs/react";
import AuthShell from "../../../components/layouts/AuthShell";
import StyledButton from "../../../components/utils/StyledButton";
import StyledTextField from "../../../components/utils/StyledTextField";
import FieldLabel from "../../../components/utils/forms/FieldLabel";

interface PasswordResetProps {
    // Set once a code was sent: the page then asks for it (or the agent can just use the emailed link instead).
    email: string | null;
}

const primarySx = {
    backgroundColor: "var(--lr-primary)",
    color: "var(--lr-on-primary)",
    ":hover": { backgroundColor: "var(--lr-primary-hover)" },
    "&.Mui-disabled": { backgroundColor: "var(--lr-surface-container)", color: "var(--lr-text-secondary)" },
};

// Forgot password, before the new-password page: confirm the account's email, then confirm it's really them with the
// 6-digit code the email also carries (or by opening the link in that same email).
function PasswordReset({ email }: PasswordResetProps) {
    const send = useForm({ email: "" });
    const verify = useForm({ code: "" });
    const resend = useForm({ email: email ?? "" });

    const sendCode = (e: FormEvent) => {
        e.preventDefault();
        send.post("/password-reset/send", { preserveScroll: true });
    };
    const verifyCode = (e: FormEvent) => {
        e.preventDefault();
        verify.post("/password-reset/verify", { preserveScroll: true });
    };

    return (
        <AuthShell>
            <Typography sx={{ fontSize: 28, color: "var(--lr-text-primary)" }}>Forgot your password?</Typography>
            <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", mt: 0.5, mb: 3 }}>
                {!email ? "Enter your account's email and we'll send you a code and a reset link." : "We sent a code and a reset link to your email."}
            </Typography>

            {!email ? (
                <Box component="form" onSubmit={sendCode} noValidate sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box>
                        <FieldLabel text="Email" required />
                        <StyledTextField
                            type="email"
                            name="email"
                            placeholder="you@example.com"
                            value={send.data.email}
                            error={send.errors.email ?? null}
                            handleChange={(e) => send.setData("email", e.target.value)}
                        />
                    </Box>
                    <StyledButton type="submit" variant="contained" loading={send.processing} disabled={!send.data.email} sx={primarySx}>
                        Send code
                    </StyledButton>
                </Box>
            ) : (
                <Box component="form" onSubmit={verifyCode} noValidate sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", p: 1.5, borderRadius: 2, backgroundColor: "var(--lr-primary-soft)" }}>
                        <MarkEmailReadRounded sx={{ color: "var(--lr-primary)" }} />
                        <Typography variant="body2" sx={{ color: "var(--lr-text-primary)" }}>
                            We sent a 6-digit code and a reset link to <strong>{email}</strong>. Both work for 10 minutes — use whichever is easiest.
                        </Typography>
                    </Box>
                    <Box>
                        <FieldLabel text="Code" required />
                        <StyledTextField
                            name="code"
                            placeholder="123456"
                            value={verify.data.code}
                            error={verify.errors.code ?? null}
                            handleChange={(e) => verify.setData("code", e.target.value.replace(/\D/g, "").slice(0, 6))}
                            props={{ slotProps: { htmlInput: { inputMode: "numeric", autoComplete: "one-time-code", maxLength: 6 } } }}
                        />
                    </Box>
                    <StyledButton type="submit" variant="contained" loading={verify.processing} disabled={verify.data.code.length !== 6} sx={primarySx}>
                        Confirm code
                    </StyledButton>
                    <StyledButton
                        size="small"
                        variant="text"
                        disabled={resend.processing}
                        onClick={() => resend.post("/password-reset/send", { preserveScroll: true })}
                        sx={{ px: 1, alignSelf: "flex-start", color: "var(--lr-primary)" }}
                    >
                        Send a new code
                    </StyledButton>
                    {resend.errors.email && <FormHelperText error>{resend.errors.email}</FormHelperText>}
                </Box>
            )}
        </AuthShell>
    );
}

export default PasswordReset;
