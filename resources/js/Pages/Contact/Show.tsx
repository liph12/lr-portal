import { FormEvent, ReactNode, useState } from "react";
import { Box, Checkbox, Divider, Grid, Stack, Typography } from "@mui/material";
import { CheckCircleRounded, DownloadRounded, EmailRounded, PhoneRounded, PlaceRounded, SendRounded } from "@mui/icons-material";
import { Head, useForm } from "@inertiajs/react";
import PublicHeader from "../../components/layouts/PublicHeader";
import StyledButton from "../../components/utils/StyledButton";
import StyledTextField from "../../components/utils/StyledTextField";
import StyledAutocomplete from "../../components/utils/StyledAutocomplete";
import UserAvatar from "../../components/utils/user/UserAvatar";
import { titleCase } from "../../helpers/titleCase";

interface ContactCard {
    name: string;
    title: string;
    avatar: string | null;
    mobile: string | null;
    email: string | null;
    address: string | null;
}

interface ShowProps {
    slug: string;
    agent: ContactCard;
    options: { roles: string[]; types: string[] };
}

interface InquiryForm {
    inquirer_role: string;
    inquiry_type: string;
    first_name: string;
    middle_name: string;
    last_name: string;
    email: string;
    contact_number: string;
    message: string;
    consent: boolean;
}

const labelSx = {
    display: "block",
    mb: 0.75,
    fontSize: 12,
    fontWeight: 600,
    color: "var(--lr-text-secondary)",
};

function Label({ text, required = false }: { text: string; required?: boolean }) {
    return (
        <Typography component="span" sx={labelSx}>
            {text}
            {required && <Box component="span" sx={{ color: "var(--lr-error)", ml: 0.5 }}>*</Box>}
        </Typography>
    );
}

function ContactRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
    return (
        <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ textAlign: "left" }}>
            <Box sx={{ display: "flex", mt: "2px", color: "var(--lr-primary)", "& svg": { fontSize: 18 } }}>{icon}</Box>
            <Typography variant="body2" sx={{ wordBreak: "break-word", lineHeight: 1.5 }}>
                {children}
            </Typography>
        </Stack>
    );
}

export default function Show({ slug, agent, options }: ShowProps) {
    const [sent, setSent] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [consentHint, setConsentHint] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm<InquiryForm>({
        inquirer_role: options.roles[0] ?? "",
        inquiry_type: options.types[0] ?? "",
        first_name: "",
        middle_name: "",
        last_name: "",
        email: "",
        contact_number: "",
        message: "",
        consent: false,
    });

    const choices = (values: string[]) => values.map((v) => ({ id: v, label: v }));
    const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    const checkEmail = (v: string) => setEmailError(v && !validEmail(v) ? "Enter a valid email address." : null);
    const consentError = errors.consent ?? (consentHint ? "Please tick the box to accept the privacy policy before sending." : null);
    const firstName = agent.name.split(" ")[0];

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        checkEmail(data.email);
        if (!validEmail(data.email)) return;
        post(`/contact/${slug}`, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setSent(true);
            },
        });
    };

    return (
        <Box
            sx={{
                height: "100vh",
                "@supports (height: 100dvh)": { height: "100dvh" },
                // Self-scrolling: outside AppLayout, and html/body may be overflow-locked
                overflowY: "auto",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                backgroundColor: "var(--lr-surface-dim)",
            }}
        >
            <Head title={`Contact ${agent.name}`} />

            <PublicHeader />

            <Box sx={{ flex: 1, px: { xs: 2, sm: 3 }, py: { xs: 3, sm: 5 } }}>
                <Box
                    sx={{
                        maxWidth: 960,
                        mx: "auto",
                        borderRadius: 4,
                        overflow: "hidden",
                        border: "1px solid var(--lr-border)",
                        backgroundColor: "var(--lr-surface)",
                        boxShadow: "0 8px 30px rgba(60,64,67,.12)",
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "300px 1fr" },
                    }}
                >
                    {/* Agent card */}
                    <Box
                        sx={{
                            backgroundColor: "var(--lr-surface)",
                            borderRight: { md: "1px solid var(--lr-border)" },
                            borderBottom: { xs: "1px solid var(--lr-border)", md: "none" },
                            color: "var(--lr-text-primary)",
                            px: 3,
                            py: { xs: 4, md: 6 },
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            textAlign: "center",
                        }}
                    >
                        <UserAvatar
                            name={agent.name}
                            src={agent.avatar}
                            size={140}
                            sx={{ border: "4px solid var(--lr-primary-soft)", boxShadow: "0 1px 3px rgba(60,64,67,.15)" }}
                        />
                        <Typography sx={{ mt: 2.5, fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: "var(--lr-text-primary)" }}>
                            {agent.name}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1, fontWeight: 500, color: "var(--lr-primary)" }}>
                            {agent.title}
                        </Typography>

                        <Stack spacing={1.25} sx={{ mt: 3, width: "100%", maxWidth: 240, color: "var(--lr-text-body)" }}>
                            {agent.mobile && (
                                <ContactRow icon={<PhoneRounded />}>
                                    <Box component="a" href={`tel:${agent.mobile}`} sx={{ color: "inherit", textDecoration: "none" }}>
                                        {agent.mobile}
                                    </Box>
                                </ContactRow>
                            )}
                            {agent.email && (
                                <ContactRow icon={<EmailRounded />}>
                                    <Box component="a" href={`mailto:${agent.email}`} sx={{ color: "inherit", textDecoration: "none" }}>
                                        {agent.email}
                                    </Box>
                                </ContactRow>
                            )}
                            {agent.address && <ContactRow icon={<PlaceRounded />}>{agent.address}</ContactRow>}
                        </Stack>

                        <Divider sx={{ my: 3, width: 120, borderColor: "var(--lr-border)" }} />

                        <StyledButton
                            component="a"
                            href={`/contact/${slug}/vcard`}
                            variant="contained"
                            fullWidth
                            startIcon={<DownloadRounded />}
                            sx={{
                                maxWidth: 240,
                                borderRadius: 2,
                                py: 1.25,
                                fontWeight: 700,
                                letterSpacing: "0.04em",
                                backgroundColor: "var(--lr-primary)",
                                color: "var(--lr-on-primary)",
                                ":hover": { backgroundColor: "var(--lr-primary-hover)" },
                            }}
                        >
                            Save contact
                        </StyledButton>
                    </Box>

                    {/* Inquiry form */}
                    <Box sx={{ px: { xs: 2.5, sm: 4 }, py: { xs: 3, sm: 4 } }}>
                        <Typography sx={{ fontSize: { xs: 24, sm: 28 }, fontWeight: 700, color: "var(--lr-text-primary)" }}>
                            Get in touch
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5, mb: 3, color: "var(--lr-text-secondary)" }}>
                            Send your inquiry and we'll get back to you as soon as possible.
                        </Typography>

                        {sent ? (
                            <Box sx={{ textAlign: "center", py: 6 }}>
                                <CheckCircleRounded sx={{ fontSize: 56, color: "var(--lr-success-icon)" }} />
                                <Typography sx={{ mt: 2, fontSize: 18, fontWeight: 600, color: "var(--lr-text-primary)" }}>
                                    Your inquiry has been sent
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 0.5, color: "var(--lr-text-secondary)" }}>
                                    {firstName} will get back to you as soon as possible.
                                </Typography>
                                <StyledButton variant="outlined" sx={{ mt: 3 }} onClick={() => setSent(false)}>
                                    Send another inquiry
                                </StyledButton>
                            </Box>
                        ) : (
                            <Box component="form" onSubmit={handleSubmit} noValidate>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Label text="I'm Here to Inquire as a/an" />
                                        <StyledAutocomplete
                                            options={choices(options.roles)}
                                            value={data.inquirer_role ? { id: data.inquirer_role, label: data.inquirer_role } : null}
                                            onChange={(_, v) => setData("inquirer_role", v ? String(v.id) : "")}
                                            isOptionEqualToValue={(o, v) => o.id === v.id}
                                            renderInput={(params) => (
                                                <StyledTextField params={params} name="inquirer_role" placeholder="Select one" error={errors.inquirer_role ?? null} />
                                            )}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Label text="Inquiry Type" />
                                        <StyledAutocomplete
                                            options={choices(options.types)}
                                            value={data.inquiry_type ? { id: data.inquiry_type, label: data.inquiry_type } : null}
                                            onChange={(_, v) => setData("inquiry_type", v ? String(v.id) : "")}
                                            isOptionEqualToValue={(o, v) => o.id === v.id}
                                            renderInput={(params) => (
                                                <StyledTextField params={params} name="inquiry_type" placeholder="Select one" error={errors.inquiry_type ?? null} />
                                            )}
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <Label text="First Name" required />
                                        <StyledTextField
                                            name="first_name"
                                            placeholder="Enter your first name"
                                            value={data.first_name}
                                            handleChange={(e) => setData("first_name", titleCase(e.target.value))}
                                            error={errors.first_name ?? null}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <Label text="Middle Name" />
                                        <StyledTextField
                                            name="middle_name"
                                            placeholder="Enter your middle name"
                                            value={data.middle_name}
                                            handleChange={(e) => setData("middle_name", titleCase(e.target.value))}
                                            error={errors.middle_name ?? null}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <Label text="Last Name" required />
                                        <StyledTextField
                                            name="last_name"
                                            placeholder="Enter your last name"
                                            value={data.last_name}
                                            handleChange={(e) => setData("last_name", titleCase(e.target.value))}
                                            error={errors.last_name ?? null}
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Label text="Your Email" required />
                                        <StyledTextField
                                            name="email"
                                            type="email"
                                            placeholder="your.email@example.com"
                                            value={data.email}
                                            handleChange={(e) => {
                                                const v = e.target.value.replace(/\s+/g, "");
                                                setData("email", v);
                                                if (emailError) checkEmail(v);
                                            }}
                                            props={{ onBlur: () => checkEmail(data.email), inputProps: { inputMode: "email", autoCapitalize: "none" } }}
                                            error={errors.email ?? emailError}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Label text="Contact Number" required />
                                        <StyledTextField
                                            name="contact_number"
                                            type="tel"
                                            placeholder="09XX XXX XXXX"
                                            value={data.contact_number}
                                            handleChange={(e) => setData("contact_number", e.target.value)}
                                            error={errors.contact_number ?? null}
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12 }}>
                                        <Label text="Message" required />
                                        <StyledTextField
                                            name="message"
                                            placeholder="Tell us about your inquiry..."
                                            value={data.message}
                                            handleChange={(e) => setData("message", e.target.value)}
                                            error={errors.message ?? null}
                                            props={{ multiline: true, minRows: 4 }}
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12 }}>
                                        <Box
                                            component="label"
                                            sx={{
                                                display: "flex",
                                                alignItems: "flex-start",
                                                gap: 1,
                                                p: 2,
                                                borderRadius: 2,
                                                border: `1px solid ${consentError ? "var(--lr-error)" : "var(--lr-border)"}`,
                                                backgroundColor: "var(--lr-surface-dim)",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <Checkbox
                                                size="small"
                                                checked={data.consent}
                                                onChange={(e) => {
                                                    setData("consent", e.target.checked);
                                                    if (e.target.checked) setConsentHint(false);
                                                }}
                                                sx={{ p: 0, mt: "2px", color: "var(--lr-outline)", "&.Mui-checked": { color: "var(--lr-primary)" } }}
                                            />
                                            <Typography variant="caption" sx={{ color: "var(--lr-text-body)", fontWeight: 500, lineHeight: 1.6 , textAlign: "justify"}}>
                                                By submitting this form, I certify that I have read and accept the Privacy Policy and authorize Filipinohomes, its employees, authorized representatives and third party service providers, and consent to the use and processing of my personal information to contact me with marketing or promotional information through phone call, mail, email, SMS or any type of electronic message.
                                            </Typography>
                                        </Box>
                                        {consentError && (
                                            <Typography variant="caption" component="div" sx={{ color: "var(--lr-error)", mt: 0.5, ml: 0.5 }}>
                                                {consentError}
                                            </Typography>
                                        )}
                                    </Grid>

                                    {/* A disabled button swallows clicks; the wrapper explains why it's off. */}
                                    <Grid size={{ xs: 12 }} onClick={() => !data.consent && setConsentHint(true)}>
                                        <StyledButton
                                            type="submit"
                                            variant="contained"
                                            fullWidth
                                            size="large"
                                            disabled={processing || !data.consent}
                                            startIcon={<SendRounded />}
                                            sx={{
                                                borderRadius: 2,
                                                py: 1.5,
                                                fontWeight: 700,
                                                letterSpacing: "0.04em",
                                                backgroundColor: "var(--lr-primary)",
                                                color: "var(--lr-on-primary)",
                                                ":hover": { backgroundColor: "var(--lr-primary-hover)" },
                                            }}
                                        >
                                            {processing ? "Sending…" : "Send inquiry"}
                                        </StyledButton>
                                    </Grid>
                                </Grid>
                            </Box>
                        )}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
