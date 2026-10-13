import { ChangeEvent, FormEvent, ReactNode } from "react";
import { Box, FormHelperText, Grid, InputAdornment } from "@mui/material";
import { Facebook, Instagram, LinkedIn, PhoneRounded, WhatsApp, X } from "@mui/icons-material";
import { useForm } from "@inertiajs/react";
import StyledTextField from "../StyledTextField";
import StyledButton from "../StyledButton";
import { BusinessProfileFields } from "../../../types/app-data-types";

interface BusinessProfileFormProps {
    business: BusinessProfileFields;
}

const labelSx = { color: "var(--lr-text-secondary)", fontWeight: 500, mb: 0.5, ml: 0.5 };

function Label({ text }: { text: string }) {
    return <FormHelperText sx={labelSx}>{text}</FormHelperText>;
}

// The icon at the start of each field, so the row reads at a glance.
const adornment = (icon: ReactNode) => ({
    slotProps: {
        input: {
            startAdornment: (
                <InputAdornment position="start" sx={{ color: "var(--lr-text-secondary)" }}>
                    {icon}
                </InputAdornment>
            ),
        },
    },
});

// Profile › Business profile: only what the public business profile shows (POST /profile/business).
export default function BusinessProfileForm({ business }: BusinessProfileFormProps) {
    const form = useForm<BusinessProfileFields>(business);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const key = e.target.name as keyof BusinessProfileFields;
        form.setData(key, e.target.value);
        if (form.errors[key]) form.clearErrors(key);
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        // The saved values become the new baseline, so the form stops counting them as unsaved changes.
        form.post("/profile/business", { preserveScroll: true, onSuccess: () => form.setDefaults() });
    };

    const field = (name: keyof BusinessProfileFields, label: string, icon: ReactNode, opts: { type?: string; placeholder?: string; helper?: string } = {}) => (
        <Grid size={12}>
            <Label text={label} />
            <StyledTextField
                name={name}
                type={opts.type}
                placeholder={opts.placeholder}
                value={form.data[name]}
                error={form.errors[name] ?? null}
                handleChange={handleChange}
                props={adornment(icon)}
            />
            {opts.helper && <FormHelperText sx={{ ml: 0.5, color: "var(--lr-text-secondary)" }}>{opts.helper}</FormHelperText>}
        </Grid>
    );

    return (
        <Box component="form" onSubmit={handleSubmit} noValidate>
            <Grid container spacing={2}>
                <Grid size={12}>
                    <Label text="About Me Profile Description" />
                    <StyledTextField
                        name="about"
                        placeholder="Tell clients who you are: your specialties, the areas you cover, your experience"
                        value={form.data.about}
                        error={form.errors.about ?? null}
                        handleChange={handleChange}
                        props={{ multiline: true, minRows: 5, slotProps: { htmlInput: { maxLength: 1000 } } }}
                    />
                </Grid>
                {field("mobile", "Mobile/Phone", <PhoneRounded fontSize="small" />, { type: "tel", placeholder: "09XX XXX XXXX" })}
                {field("facebook", "Facebook Profile Link (Optional)", <Facebook fontSize="small" />, { type: "url", placeholder: "https://facebook.com/yourusername" })}
                {field("instagram", "Instagram Profile Link (Optional)", <Instagram fontSize="small" />, { type: "url", placeholder: "https://instagram.com/yourusername" })}
                {field("twitter", "X (Twitter) Profile Link (Optional)", <X fontSize="small" />, { type: "url", placeholder: "https://x.com/yourusername" })}
                {field("linkedin", "LinkedIn Profile Link (Optional)", <LinkedIn fontSize="small" />, { type: "url", placeholder: "https://linkedin.com/in/yourusername" })}
                {field("whatsapp", "WhatsApp Number (Optional)", <WhatsApp fontSize="small" />, {
                    type: "tel",
                    placeholder: "09XX XXX XXXX",
                    helper: "This number will be used for client communication features.",
                })}
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
