import { FormEvent, ReactNode } from "react";
import { Box, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { AccountTreeRounded, DarkModeOutlined, LightModeOutlined, SettingsBrightnessOutlined } from "@mui/icons-material";
import { useColorScheme } from "@mui/material/styles";
import { useForm } from "@inertiajs/react";
import SectionCard from "../../cards/SectionCard";
import StyledButton from "../StyledButton";
import usePortalRoutes from "../../../hooks/usePortalRoutes";
import { FONT_SCALES, FONT_SIZE_LABELS } from "../../../helpers/appearance";
import { FontSize, LinkMode, ThemeMode, UserPreferences } from "../../../types";

interface PreferencesFormProps {
    preferences: UserPreferences;
}

interface PreferencesFields {
    theme: ThemeMode;
    font_size: FontSize;
    genealogy_per_branch: number;
    genealogy_layout: UserPreferences["genealogy_layout"];
    links: UserPreferences["links"];
}

const toggleSx = {
    flexShrink: 0,
    flexWrap: "wrap",
    "& .MuiToggleButton-root": { textTransform: "none", px: 1.5, py: 0.5, fontSize: 13, gap: 0.75, borderColor: "var(--lr-border)", color: "var(--lr-text-secondary)" },
    "& .Mui-selected": { color: "var(--lr-primary) !important", backgroundColor: "var(--lr-primary-soft) !important" },
};

const THEMES: { value: ThemeMode; label: string; icon: typeof LightModeOutlined }[] = [
    { value: "light", label: "Light", icon: LightModeOutlined },
    { value: "dark", label: "Dark", icon: DarkModeOutlined },
    { value: "system", label: "System default", icon: SettingsBrightnessOutlined },
];

// Mirrors User::GENEALOGY_SIZES.
const GENEALOGY_SIZES = [5, 10, 20, 30, 50];

const LINK_LABELS: Record<LinkMode, string> = { spa: "Same tab", tab: "New tab" };

// A labelled setting: title and help on the left, its control on the right (stacked on phones).
function Setting({ title, help, children }: { title: string; help: string; children: ReactNode }) {
    return (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap", py: 1.5 }}>
            <Box sx={{ minWidth: 0, flex: "1 1 240px" }}>
                <Typography sx={{ fontWeight: 500, color: "var(--lr-text-primary)" }}>{title}</Typography>
                <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                    {help}
                </Typography>
            </Box>
            {children}
        </Box>
    );
}

// Settings › Preferences: theme, text size and where links open, saved to the account in one go.
export default function PreferencesForm({ preferences }: PreferencesFormProps) {
    const sections = usePortalRoutes();
    const { mode } = useColorScheme();
    const form = useForm<PreferencesFields>({
        // Not chosen yet: start from what this device shows now.
        theme: preferences.theme ?? (mode as ThemeMode | undefined) ?? "light",
        font_size: preferences.font_size,
        genealogy_per_branch: preferences.genealogy_per_branch,
        genealogy_layout: preferences.genealogy_layout,
        links: { default: preferences.links.default, sections: { ...preferences.links.sections } },
    });

    // "" = follow the overall setting, so the section's key is dropped.
    const setSection = (path: string, value: LinkMode | "") => {
        const next = { ...form.data.links.sections };
        if (value) next[path] = value;
        else delete next[path];
        form.setData("links", { ...form.data.links, sections: next });
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.put("/settings/preferences", { preserveScroll: true, onSuccess: () => form.setDefaults() });
    };

    return (
        <Box component="form" onSubmit={submit} noValidate sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <SectionCard title="Appearance" subtitle="Applies on every device you sign in to.">
                <Setting title="Theme" help="Light, dark, or follow your device's setting.">
                    <ToggleButtonGroup size="small" exclusive value={form.data.theme} onChange={(_, v: ThemeMode | null) => v && form.setData("theme", v)} aria-label="Theme" sx={toggleSx}>
                        {THEMES.map((t) => (
                            <ToggleButton key={t.value} value={t.value}>
                                <t.icon sx={{ fontSize: 18 }} aria-hidden />
                                {t.label}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                </Setting>
                <Setting title="Text size" help="Makes text and everything around it larger or smaller.">
                    <ToggleButtonGroup size="small" exclusive value={form.data.font_size} onChange={(_, v: FontSize | null) => v && form.setData("font_size", v)} aria-label="Text size" sx={toggleSx}>
                        {(Object.keys(FONT_SIZE_LABELS) as FontSize[]).map((size) => (
                            <ToggleButton key={size} value={size}>
                                {FONT_SIZE_LABELS[size]}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                </Setting>
                <Box sx={{ mt: 1, p: 2, borderRadius: 2, backgroundColor: "var(--lr-surface-container)" }}>
                    <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                        Preview
                    </Typography>
                    {/* Relative to the size in use now, so the preview shows the chosen size. */}
                    <Box sx={{ zoom: FONT_SCALES[form.data.font_size] / FONT_SCALES[preferences.font_size] }}>
                        <Typography sx={{ color: "var(--lr-text-primary)" }}>Total sales this month: ₱12,500,000</Typography>
                        <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                            12 sales · 4 agents · Cebu
                        </Typography>
                    </Box>
                </Box>
            </SectionCard>

            <SectionCard title="Genealogy" subtitle="Also adjustable on the genealogy canvas itself.">
                <Setting title="Recruits per card" help="How many recruits an opened card shows at first — those with the biggest downlines. Show more loads the next batch.">
                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={form.data.genealogy_per_branch}
                        onChange={(_, v: number | null) => v && form.setData("genealogy_per_branch", v)}
                        aria-label="Recruits per card"
                        sx={toggleSx}
                    >
                        {GENEALOGY_SIZES.map((size) => (
                            <ToggleButton key={size} value={size}>
                                {size}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                </Setting>
                <Setting title="Layout" help="Top to bottom, each level a row; or left to right, each level a column.">
                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={form.data.genealogy_layout}
                        onChange={(_, v: PreferencesFields["genealogy_layout"] | null) => v && form.setData("genealogy_layout", v)}
                        aria-label="Genealogy layout"
                        sx={toggleSx}
                    >
                        <ToggleButton value="vertical">
                            <AccountTreeRounded sx={{ fontSize: 18 }} aria-hidden />
                            Top to bottom
                        </ToggleButton>
                        <ToggleButton value="horizontal">
                            <AccountTreeRounded sx={{ fontSize: 18, transform: "rotate(-90deg)" }} aria-hidden />
                            Left to right
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Setting>
            </SectionCard>

            <SectionCard title="Links" subtitle="Where pages open when you click a link, menu item or table row.">
                <Setting title="Open pages in" help="Same tab keeps you in one tab; new tab opens every page you go to in its own tab.">
                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={form.data.links.default}
                        onChange={(_, v: LinkMode | null) => v && form.setData("links", { ...form.data.links, default: v })}
                        aria-label="Open pages in"
                        sx={toggleSx}
                    >
                        <ToggleButton value="spa">{LINK_LABELS.spa}</ToggleButton>
                        <ToggleButton value="tab">{LINK_LABELS.tab}</ToggleButton>
                    </ToggleButtonGroup>
                </Setting>

                <Typography variant="body2" sx={{ mt: 1.5, mb: 1, fontWeight: 500, color: "var(--lr-text-secondary)" }}>
                    By section — every page under it, including profiles and sales opened from there
                </Typography>
                <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, border: "1px solid var(--lr-border)", borderRadius: 3 }}>
                    {sections.map((s, i) => (
                        <Box
                            component="li"
                            key={s.path}
                            sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", px: 2, py: 1.25, borderTop: i ? "1px solid var(--lr-border)" : "none" }}
                        >
                            {s.icon && <Box component={s.icon} sx={{ fontSize: 20, color: "var(--lr-text-secondary)" }} aria-hidden />}
                            <Typography sx={{ flex: 1, minWidth: 120, color: "var(--lr-text-primary)" }}>{s.name}</Typography>
                            <ToggleButtonGroup
                                size="small"
                                exclusive
                                value={form.data.links.sections[s.path] ?? ""}
                                onChange={(_, v: LinkMode | "" | null) => v !== null && setSection(s.path, v)}
                                aria-label={`${s.name} pages open in`}
                                sx={toggleSx}
                            >
                                <ToggleButton value="">Default ({LINK_LABELS[form.data.links.default].toLowerCase()})</ToggleButton>
                                <ToggleButton value="spa">{LINK_LABELS.spa}</ToggleButton>
                                <ToggleButton value="tab">{LINK_LABELS.tab}</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>
                    ))}
                </Box>
            </SectionCard>

            {Object.keys(form.errors).length > 0 && (
                <Typography variant="body2" sx={{ color: "var(--lr-error)" }}>
                    {Object.values(form.errors)[0]}
                </Typography>
            )}
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <StyledButton type="submit" variant="contained" disabled={form.processing || !form.isDirty} sx={{ backgroundColor: "var(--lr-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } }}>
                    Save preferences
                </StyledButton>
            </Box>
        </Box>
    );
}
