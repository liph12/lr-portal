import { ChangeEvent, FormEvent } from "react";
import { Box, FormHelperText, Grid, Typography } from "@mui/material";
import { useForm } from "@inertiajs/react";
import StyledTextField from "../StyledTextField";
import StyledAutocomplete from "../StyledAutocomplete";
import StyledButton from "../StyledButton";
import { ProfileFields } from "../../../types/app-data-types";

interface ProfileDetailsFormProps {
    profile: ProfileFields;
    maritalStatuses: string[];
    // Where it saves: your own profile by default; an agent's from their profile page (PUT /agents/{id}).
    action?: { url: string; method: "post" | "put" };
    onSaved?: () => void;
}

const labelSx = { color: "var(--lr-text-secondary)", fontWeight: 500, mb: 0.5, ml: 0.5 };

const GENDERS = [
    { id: "Male", label: "Male" },
    { id: "Female", label: "Female" },
];

function Label({ text, required }: { text: string; required?: boolean }) {
    return (
        <FormHelperText sx={labelSx}>
            {text}
            {required && <span style={{ color: "var(--lr-error)" }}> *</span>}
        </FormHelperText>
    );
}

function GroupTitle({ children }: { children: string }) {
    return (
        <Typography
            variant="caption"
            component="h3"
            sx={{ display: "block", color: "var(--lr-text-secondary)", fontWeight: 500, letterSpacing: 0.3, mb: 1.5 }}
        >
            {children}
        </Typography>
    );
}

export default function ProfileDetailsForm({ profile, maritalStatuses, action = { url: "/profile", method: "post" }, onSaved }: ProfileDetailsFormProps) {
    const form = useForm<ProfileFields>(profile);
    const maritalOptions = maritalStatuses.map((m) => ({ id: m, label: m }));

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const key = e.target.name as keyof ProfileFields;
        form.setData(key, e.target.value as never);
        if (form.errors[key]) form.clearErrors(key);
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        // The saved values become the new baseline, so the form stops counting them as unsaved changes.
        form.submit(action.method, action.url, {
            preserveScroll: true,
            onSuccess: () => {
                form.setDefaults();
                onSaved?.();
            },
        });
    };

    const text = (name: keyof ProfileFields, label: string, opts: { required?: boolean; type?: string; placeholder?: string; size?: number } = {}) => (
        <Grid size={{ xs: 12, sm: opts.size ?? 6, md: opts.size ?? 4 }}>
            <Label text={label} required={opts.required} />
            <StyledTextField
                name={name}
                type={opts.type}
                placeholder={opts.placeholder}
                value={(form.data[name] as string) ?? ""}
                error={form.errors[name] ?? null}
                handleChange={handleChange}
            />
        </Grid>
    );

    return (
        <Box component="form" onSubmit={handleSubmit} noValidate>
            <GroupTitle>PERSONAL</GroupTitle>
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {text("first_name", "First Name", { required: true })}
                {text("middle_name", "Middle Name")}
                {text("last_name", "Last Name", { required: true })}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Label text="Gender" />
                    <StyledAutocomplete
                        options={GENDERS}
                        value={GENDERS.find((g) => g.id === form.data.gender) ?? null}
                        renderInput={(params) => (
                            <StyledTextField params={params} name="gender" error={form.errors.gender ?? null} />
                        )}
                        onChange={(_, v) => form.setData("gender", (v?.label as ProfileFields["gender"]) ?? null)}
                        isOptionEqualToValue={(o, v) => o.id === v.id}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Label text="Marital Status" />
                    <StyledAutocomplete
                        options={maritalOptions}
                        value={maritalOptions.find((m) => m.id === form.data.marital_status) ?? null}
                        renderInput={(params) => (
                            <StyledTextField params={params} name="marital_status" error={form.errors.marital_status ?? null} />
                        )}
                        onChange={(_, v) => form.setData("marital_status", v?.label ?? null)}
                        isOptionEqualToValue={(o, v) => o.id === v.id}
                    />
                </Grid>
            </Grid>

            <GroupTitle>CONTACT & ADDRESS</GroupTitle>
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {text("email", "Email", { required: true, type: "email" })}
                {text("mobile", "Mobile", { type: "tel", placeholder: "09XX XXX XXXX" })}
                {text("phone", "Landline", { type: "tel" })}
                {text("address", "Street Address", { size: 12 })}
                {text("city", "City / Municipality")}
                {text("state", "Province")}
            </Grid>

            <GroupTitle>ABOUT & SOCIAL</GroupTitle>
            <Grid container spacing={2}>
                <Grid size={12}>
                    <Label text="About" />
                    <StyledTextField
                        name="about"
                        placeholder="A short line clients will see, e.g. specialties or areas you cover"
                        value={form.data.about}
                        error={form.errors.about ?? null}
                        handleChange={handleChange}
                        props={{ multiline: true, rows: 2, slotProps: { htmlInput: { maxLength: 255 } } }}
                    />
                </Grid>
                {text("facebook", "Facebook", { type: "url", placeholder: "https://facebook.com/…" })}
                {text("linkedin", "LinkedIn", { type: "url", placeholder: "https://linkedin.com/in/…" })}
                {text("whatsapp", "WhatsApp", { type: "tel" })}
            </Grid>

            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 3 }}>
                <StyledButton
                    type="button"
                    disabled={!form.isDirty || form.processing}
                    onClick={() => {
                        form.reset();
                        form.clearErrors();
                    }}
                    sx={{ px: 2, color: "var(--lr-text-secondary)" }}
                >
                    Discard
                </StyledButton>
                <StyledButton
                    type="submit"
                    variant="contained"
                    loading={form.processing}
                    disabled={!form.isDirty}
                    sx={{ px: 3, backgroundColor: "var(--lr-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } }}
                >
                    Save changes
                </StyledButton>
            </Box>
        </Box>
    );
}
