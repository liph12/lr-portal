import { FormEvent } from "react";
import { Box, Checkbox, FormControlLabel, FormHelperText, Typography } from "@mui/material";
import { MarkEmailReadRounded, PersonSearchRounded } from "@mui/icons-material";
import { Link, useForm } from "@inertiajs/react";
import AuthShell from "../../../components/layouts/AuthShell";
import StyledButton from "../../../components/utils/StyledButton";
import StyledTextField from "../../../components/utils/StyledTextField";
import FieldLabel from "../../../components/utils/forms/FieldLabel";
import SponsorCard, { Sponsor } from "../../../components/registration/SponsorCard";

interface RegisterProps {
    // The referral link's agent id (?ref=).
    referral: number | null;
    // Who the referral link points to; null when the link is missing or not valid.
    sponsor: Sponsor | null;
    // Set once a code was sent: the page asks for it.
    email: string | null;
    // A salesperson (local) or a Global Partner (international, from a &type=international link).
    type: "local" | "international";
}

const primarySx = {
    backgroundColor: "var(--lr-primary)",
    color: "var(--lr-on-primary)",
    ":hover": { backgroundColor: "var(--lr-primary-hover)" },
    "&.Mui-disabled": { backgroundColor: "var(--lr-surface-container)", color: "var(--lr-text-secondary)" },
};

// Agent registration, before the four steps: confirm the sponsor from the referral link, then confirm the email with the
// 6-digit code it receives.
function Register({ referral, sponsor, email, type }: RegisterProps) {
    const global = type === "international";
    const start = useForm({ ref: referral ?? "", type, confirm_sponsor: false, email: "" });
    const verify = useForm({ code: "" });
    const resend = useForm({ ref: referral ?? "", type, confirm_sponsor: true, email: email ?? "" });

    const sendCode = (e: FormEvent) => {
        e.preventDefault();
        start.post("/register/code", { preserveScroll: true });
    };
    const verifyCode = (e: FormEvent) => {
        e.preventDefault();
        verify.post("/register/verify", { preserveScroll: true });
    };

    if (!sponsor) {
        return (
            <AuthShell>
                <Box sx={{ textAlign: "center" }}>
                    <PersonSearchRounded sx={{ fontSize: 48, color: "var(--lr-text-secondary)" }} />
                    <Typography sx={{ fontSize: 24, color: "var(--lr-text-primary)", mt: 1 }}>Registration starts with your sponsor</Typography>
                    <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", mt: 1 }}>
                        {referral ? "This referral link isn't valid." : "You need a referral link."} Ask the agent who invited you (your sponsor / upline) for their Leuterio Realty referral link, then open
                        it to register.
                    </Typography>
                </Box>
            </AuthShell>
        );
    }

    return (
        <AuthShell>
            <Typography sx={{ fontSize: 28, color: "var(--lr-text-primary)" }}>{global ? "Become a Global Partner" : "Become a Salesperson"}</Typography>
            <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", mt: 0.5, mb: 3 }}>
                {global ? "Sell Philippine property from where you live, with Leuterio Realty. " : ""}Confirm your sponsor and your email, then fill in four short steps.
            </Typography>

            <SponsorCard sponsor={sponsor} />

            {!email ? (
                <Box component="form" onSubmit={sendCode} noValidate sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 3 }}>
                    <Box>
                        <FormControlLabel
                            control={<Checkbox checked={start.data.confirm_sponsor} onChange={(_, v) => start.setData("confirm_sponsor", v)} sx={{ "&.Mui-checked": { color: "var(--lr-primary)" } }} />}
                            label={
                                <Typography variant="body2" sx={{ color: "var(--lr-text-primary)" }}>
                                    I confirm that <strong>{sponsor.name}</strong> is my sponsor / upline.
                                </Typography>
                            }
                        />
                        {(start.errors.confirm_sponsor || start.errors.ref) && <FormHelperText error>{start.errors.confirm_sponsor ?? start.errors.ref}</FormHelperText>}
                    </Box>
                    <Box>
                        <FieldLabel text="Your email" required />
                        <StyledTextField type="email" name="email" placeholder="you@example.com" value={start.data.email} error={start.errors.email ?? null} handleChange={(e) => start.setData("email", e.target.value)} />
                        <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)", ml: 0.5 }}>
                            We'll send a 6-digit code to confirm it. It becomes your sign-in.
                        </Typography>
                    </Box>
                    <StyledButton type="submit" variant="contained" loading={start.processing} disabled={!start.data.confirm_sponsor || !start.data.email} sx={primarySx}>
                        Send code
                    </StyledButton>
                </Box>
            ) : (
                <Box component="form" onSubmit={verifyCode} noValidate sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 3 }}>
                    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", p: 1.5, borderRadius: 2, backgroundColor: "var(--lr-primary-soft)" }}>
                        <MarkEmailReadRounded sx={{ color: "var(--lr-primary)" }} />
                        <Typography variant="body2" sx={{ color: "var(--lr-text-primary)" }}>
                            We sent a 6-digit code to <strong>{email}</strong>. It works for 10 minutes.
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
                        Confirm email
                    </StyledButton>
                    <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                        <StyledButton size="small" variant="text" disabled={resend.processing} onClick={() => resend.post("/register/code", { preserveScroll: true })} sx={{ px: 1, color: "var(--lr-primary)" }}>
                            Send a new code
                        </StyledButton>
                        <Link href={`/register?ref=${referral}${global ? "&type=international" : ""}&change=1`} style={{ textDecoration: "none" }}>
                            <StyledButton size="small" variant="text" sx={{ px: 1, color: "var(--lr-primary)" }}>
                                Use another email
                            </StyledButton>
                        </Link>
                    </Box>
                    {resend.errors.email && <FormHelperText error>{resend.errors.email}</FormHelperText>}
                </Box>
            )}
        </AuthShell>
    );
}

export default Register;
