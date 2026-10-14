import { FormEvent, useState } from "react";
import { Box, Grid, MenuItem, Step, StepLabel, Stepper, Typography } from "@mui/material";
import { ArrowBackRounded, ArrowForwardRounded, HowToRegRounded } from "@mui/icons-material";
import { useForm } from "@inertiajs/react";
import AuthShell from "../../../components/layouts/AuthShell";
import StyledButton from "../../../components/utils/StyledButton";
import StyledTextField from "../../../components/utils/StyledTextField";
import StyledMultiAutocomplete from "../../../components/utils/StyledMultiAutocomplete";
import StyledAutocomplete from "../../../components/utils/StyledAutocomplete";
import { countries } from "../../../app-data";
import FieldLabel from "../../../components/utils/forms/FieldLabel";
import SponsorCard, { Sponsor } from "../../../components/registration/SponsorCard";
import { DEGREES, HOBBIES, PROFESSIONS } from "../../../helpers/registrationOptions";

interface RegisterDetailsProps {
    sponsor: Sponsor;
    // Confirmed with the code: it becomes their sign-in.
    email: string;
    maritalStatuses: string[];
    // A Global Partner also gives the country they live in (outside the Philippines).
    type: "local" | "international";
}

interface Details {
    first_name: string;
    middle_name: string;
    last_name: string;
    gender: string;
    marital_status: string;
    birthdate: string;
    citizenship: string;
    mobile: string;
    phone: string;
    facebook: string;
    tin: string;
    address: string;
    barangay: string;
    city: string;
    province: string;
    postal_code: string;
    country: string;
    education: string[];
    professions: string[];
    hobbies: string[];
    skills: string;
    work_experience: string;
    about: string;
    password: string;
    password_confirmation: string;
}

const STEPS = ["Basic info", "Contact", "Address", "About", "Password"];

// Global partners live outside the Philippines.
const ABROAD = countries.filter((c) => c.id !== "PH");

// Which fields each step holds (required ones first): a step is checked before moving on, and a server error opens its step.
const STEP_FIELDS: { required: (keyof Details)[]; optional: (keyof Details)[] }[] = [
    { required: ["first_name", "last_name", "gender", "marital_status", "birthdate", "citizenship"], optional: ["middle_name"] },
    { required: ["mobile"], optional: ["phone", "facebook", "tin"] },
    { required: ["address", "city", "province"], optional: ["barangay", "postal_code", "country"] },
    { required: ["education", "professions", "hobbies", "skills"], optional: ["work_experience", "about"] },
    { required: ["password", "password_confirmation"], optional: [] },
];

const primarySx = { backgroundColor: "var(--lr-primary)", color: "var(--lr-on-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } };
const eighteenYearsAgo = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toLocaleDateString("en-CA");
};

// Agent registration, steps 1–4 (basic info → about) and then the password, after the email was confirmed. One form;
// the account is created at the end, on the sponsor's team.
function RegisterDetails({ sponsor, email, maritalStatuses, type }: RegisterDetailsProps) {
    const global = type === "international";
    const [step, setStep] = useState(0);
    const form = useForm<Details>({
        first_name: "",
        middle_name: "",
        last_name: "",
        gender: "",
        marital_status: "",
        birthdate: "",
        citizenship: "Filipino",
        mobile: "",
        phone: "",
        facebook: "",
        tin: "",
        address: "",
        barangay: "",
        city: "",
        province: "",
        postal_code: "",
        country: "",
        education: [],
        professions: [],
        hobbies: [],
        skills: "",
        work_experience: "",
        about: "",
        password: "",
        password_confirmation: "",
    });
    const errors = form.errors as Partial<Record<string, string>>;
    const err = (name: keyof Details) => errors[name] ?? errors[`${name}.0`] ?? null;

    const set = <K extends keyof Details>(key: K, value: Details[K]) => {
        form.setData((d) => ({ ...d, [key]: value }));
        if (errors[key]) form.clearErrors(key);
    };

    const checkStep = (index: number) => {
        const required = global && index === 2 ? [...STEP_FIELDS[index].required, "country" as const] : STEP_FIELDS[index].required;
        const missing = required.filter((k) => {
            const v = form.data[k];
            return Array.isArray(v) ? v.length === 0 : !String(v).trim();
        });
        missing.forEach((k) => form.setError(k, "This is required."));
        if (index === 4 && form.data.password && form.data.password !== form.data.password_confirmation) {
            form.setError("password_confirmation", "The passwords don't match.");
            return false;
        }
        return missing.length === 0;
    };

    const next = () => checkStep(step) && setStep((s) => Math.min(s + 1, STEPS.length - 1));

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (step < STEPS.length - 1) return next();
        for (let i = 0; i < STEPS.length; i++) {
            if (!checkStep(i)) return setStep(i);
        }
        // A salesperson sends no country (the Philippines); a global partner's is required.
        form.transform((d) => (global ? d : { ...d, country: undefined as unknown as string }));
        form.post("/register", {
            onError: (server) => {
                const first = STEP_FIELDS.findIndex((s) => [...s.required, ...s.optional].some((k) => Object.keys(server).some((e) => e === k || e.startsWith(`${k}.`))));
                if (first >= 0) setStep(first);
            },
        });
    };

    const text = (name: keyof Details, label: string, opts: { required?: boolean; type?: string; placeholder?: string; size?: number; props?: object } = {}) => (
        <Grid size={{ xs: 12, sm: opts.size ?? 6 }}>
            <FieldLabel text={label} required={opts.required} />
            <StyledTextField
                name={name}
                type={opts.type}
                placeholder={opts.placeholder}
                value={form.data[name] as string}
                error={err(name)}
                handleChange={(e) => set(name, e.target.value as never)}
                props={opts.props}
            />
        </Grid>
    );
    const choose = (name: keyof Details, label: string, options: string[], size = 6) => (
        <Grid size={{ xs: 12, sm: size }}>
            <FieldLabel text={label} required />
            <StyledTextField
                name={name}
                value={form.data[name] as string}
                error={err(name)}
                handleChange={(e) => set(name, e.target.value as never)}
                props={{
                    select: true,
                    slotProps: { select: { displayEmpty: true } },
                    children: [
                        <MenuItem key="" value="" disabled>
                            Select
                        </MenuItem>,
                        ...options.map((o) => (
                            <MenuItem key={o} value={o}>
                                {o}
                            </MenuItem>
                        )),
                    ],
                }}
            />
        </Grid>
    );
    const many = (name: "education" | "professions" | "hobbies", label: string, options: string[], max: number) => (
        <Grid size={12}>
            <FieldLabel text={`${label} (up to ${max})`} required />
            <StyledMultiAutocomplete
                name={name}
                options={options}
                value={form.data[name]}
                onChange={(_, v) => set(name, v.slice(0, max))}
                placeholder="Pick from the list or type your own"
                error={err(name)}
            />
        </Grid>
    );

    return (
        <AuthShell maxWidth={760}>
            <Typography sx={{ fontSize: 28, color: "var(--lr-text-primary)" }}>Tell us about yourself</Typography>
            <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", mt: 0.5, mb: 2 }}>
                Registering as <strong>{email}</strong> · {global ? "Global Partner" : "Salesperson"}.
            </Typography>
            <SponsorCard sponsor={sponsor} />

            <Stepper
                activeStep={step}
                alternativeLabel
                sx={{
                    my: 3,
                    "& .MuiStepIcon-root": { color: "var(--lr-surface-container)" },
                    "& .MuiStepIcon-text": { fill: "var(--lr-text-secondary)" },
                    "& .MuiStepIcon-root.Mui-active, & .MuiStepIcon-root.Mui-completed": { color: "var(--lr-primary)" },
                    "& .MuiStepIcon-root.Mui-active .MuiStepIcon-text": { fill: "var(--lr-on-primary)" },
                    "& .MuiStepLabel-label": { color: "var(--lr-text-secondary)" },
                    "& .MuiStepLabel-label.Mui-active, & .MuiStepLabel-label.Mui-completed": { color: "var(--lr-text-primary)" },
                    "& .MuiStepLabel-label.Mui-error": { color: "var(--lr-error)" },
                    "& .MuiStepConnector-line": { borderColor: "var(--lr-border)" },
                }}
            >
                {STEPS.map((label, i) => (
                    <Step key={label} completed={i < step}>
                        <StepLabel error={STEP_FIELDS[i].required.concat(STEP_FIELDS[i].optional).some((k) => !!err(k))}>{label}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            <Box component="form" onSubmit={submit} noValidate>
                <Grid container spacing={2}>
                    {step === 0 && (
                        <>
                            {text("first_name", "First name", { required: true, size: 4 })}
                            {text("middle_name", "Middle name", { size: 4 })}
                            {text("last_name", "Last name", { required: true, size: 4 })}
                            {choose("gender", "Sex", ["Male", "Female"], 4)}
                            {choose("marital_status", "Marital status", maritalStatuses, 4)}
                            {text("birthdate", "Birthdate", { required: true, type: "date", size: 4, props: { slotProps: { htmlInput: { max: eighteenYearsAgo() } } } })}
                            {text("citizenship", "Citizenship", { required: true })}
                        </>
                    )}
                    {step === 1 && (
                        <>
                            {text("mobile", "Mobile number", { required: true, type: "tel", placeholder: "09XX XXX XXXX" })}
                            {text("phone", "Landline", { type: "tel" })}
                            {text("facebook", "Facebook link", { type: "url", placeholder: "https://facebook.com/…" })}
                            {text("tin", "TIN", { placeholder: "000-000-000-000" })}
                        </>
                    )}
                    {step === 2 && (
                        <>
                            {text("address", "Street, house no., building", { required: true, size: 12 })}
                            {text("barangay", "Barangay")}
                            {text("city", "City / municipality", { required: true })}
                            {text("province", global ? "State / province / region" : "Province", { required: true })}
                            {text("postal_code", "Postal code", { props: { slotProps: { htmlInput: { inputMode: global ? "text" : "numeric" } } } })}
                            {global && (
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <FieldLabel text="Country you live in" required />
                                    <StyledAutocomplete
                                        options={ABROAD}
                                        value={ABROAD.find((c) => c.id === form.data.country) ?? null}
                                        onChange={(_, v) => set("country", String(v?.id ?? ""))}
                                        isOptionEqualToValue={(o, v) => o.id === v.id}
                                        renderInput={(params) => <StyledTextField params={params} name="country" placeholder="Select your country" error={err("country")} />}
                                    />
                                </Grid>
                            )}
                        </>
                    )}
                    {step === 3 && (
                        <>
                            {many("education", "Degree / course", DEGREES, 5)}
                            {many("professions", "Professions", PROFESSIONS, 5)}
                            {many("hobbies", "Hobbies", HOBBIES, 10)}
                            {text("skills", "Skills", { required: true, size: 12, placeholder: "e.g. negotiation, social media, property tours" })}
                            {text("work_experience", "Work experience", { size: 12 })}
                            {text("about", "About yourself", { size: 12, props: { multiline: true, rows: 3, slotProps: { htmlInput: { maxLength: 255 } } } })}
                        </>
                    )}
                    {step === 4 && (
                        <>
                            {text("password", "Password", { required: true, type: "password", props: { slotProps: { htmlInput: { autoComplete: "new-password" } } } })}
                            {text("password_confirmation", "Confirm password", { required: true, type: "password", props: { slotProps: { htmlInput: { autoComplete: "new-password" } } } })}
                            <Grid size={12}>
                                <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                                    At least 8 characters, with letters and numbers. You'll sign in with {email}.
                                </Typography>
                            </Grid>
                        </>
                    )}
                </Grid>

                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4, gap: 1 }}>
                    <StyledButton startIcon={<ArrowBackRounded />} disabled={step === 0 || form.processing} onClick={() => setStep((s) => Math.max(0, s - 1))} sx={{ color: "var(--lr-text-secondary)" }}>
                        Back
                    </StyledButton>
                    <StyledButton
                        type="submit"
                        variant="contained"
                        loading={form.processing}
                        endIcon={step < STEPS.length - 1 ? <ArrowForwardRounded /> : <HowToRegRounded />}
                        sx={{ px: 3, ...primarySx }}
                    >
                        {step < STEPS.length - 1 ? "Next" : "Create my account"}
                    </StyledButton>
                </Box>
            </Box>
        </AuthShell>
    );
}

export default RegisterDetails;
