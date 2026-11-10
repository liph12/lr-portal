import { ChangeEvent, FormEvent } from "react";
import { Box, FormHelperText } from "@mui/material";
import { AutoAwesomeRounded } from "@mui/icons-material";
import { useForm } from "@inertiajs/react";
import StyledTextField from "../utils/StyledTextField";
import StyledButton from "../utils/StyledButton";

interface AskAiReportBarProps {
    // Whether OPENAI_API_KEY is configured — when it isn't, the bar explains that instead of inviting a doomed attempt.
    enabled: boolean;
}

// A free-text request ("condo sales in Cebu last quarter by developer") becomes the report's filters
// (ReportBuilderAiService). Submitting redirects back into this same Sales tab with the resolved filters — no
// bespoke result view, just a faster way to set the controls below.
export default function AskAiReportBar({ enabled }: AskAiReportBarProps) {
    const form = useForm({ prompt: "" });

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        form.setData("prompt", e.target.value);
        if (form.errors.prompt) form.clearErrors("prompt");
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!form.data.prompt.trim()) return;
        form.post("/superadmin/report-builder/ai", { preserveScroll: true, onSuccess: () => form.reset() });
    };

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                gap: 1.5,
                alignItems: { sm: "flex-start" },
                p: 2,
                mb: 3,
                borderRadius: 4,
                border: "1px solid var(--lr-border)",
                backgroundColor: "var(--lr-surface)",
            }}
        >
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <StyledTextField
                    name="prompt"
                    value={form.data.prompt}
                    error={form.errors.prompt ?? null}
                    handleChange={handleChange}
                    placeholder={enabled ? 'Ask for a report — "condo sales in Cebu last quarter by developer"' : "Ask AI isn't set up yet"}
                    props={{ disabled: !enabled, slotProps: { htmlInput: { maxLength: 500 } } }}
                />
                {!enabled && (
                    <FormHelperText sx={{ ml: 0.5, mt: 0.5, color: "var(--lr-text-secondary)" }}>
                        Ask a superadmin to set OPENAI_API_KEY to turn this on.
                    </FormHelperText>
                )}
            </Box>
            <StyledButton
                type="submit"
                variant="contained"
                startIcon={<AutoAwesomeRounded />}
                loading={form.processing}
                disabled={!enabled || !form.data.prompt.trim()}
                sx={{ px: 3, whiteSpace: "nowrap", backgroundColor: "var(--lr-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } }}
            >
                Ask AI
            </StyledButton>
        </Box>
    );
}
