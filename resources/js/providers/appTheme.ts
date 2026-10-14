import { createTheme } from "@mui/material/styles";

const FONT = '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

// Mirrors the --lr-* tokens in resources/css/app.css (the Leuterio Realty palette); MUI needs literal colors to derive
// hover/alpha shades. Components are flat: borders and soft fills, no elevation, red only as the tab marker.
export const appTheme = createTheme({
    cssVariables: { colorSchemeSelector: "class" },
    colorSchemes: {
        light: {
            palette: {
                primary: { main: "#0055b3", dark: "#003f87", contrastText: "#ffffff" },
                secondary: { main: "#d7141a", contrastText: "#ffffff" },
                error: { main: "#c62828" },
                success: { main: "#1e8e3e" },
                warning: { main: "#b06000" },
                background: { default: "#ffffff", paper: "#ffffff" },
                text: { primary: "#0f1419", secondary: "#5b6472" },
                divider: "#e3e7ee",
            },
        },
        dark: {
            palette: {
                primary: { main: "#6aa6ff", dark: "#8ebcff", contrastText: "#04152e" },
                secondary: { main: "#e0262d", contrastText: "#ffffff" },
                error: { main: "#f87171" },
                success: { main: "#81c995" },
                warning: { main: "#fdd663" },
                background: { default: "#121418", paper: "#121418" },
                text: { primary: "#f2f4f7", secondary: "#9aa4b2" },
                divider: "#262b33",
            },
        },
    },
    typography: {
        fontFamily: FONT,
        button: { textTransform: "none", fontWeight: 600, letterSpacing: 0 },
    },
    components: {
        // Dark-mode Paper adds a white elevation overlay; surfaces here are flat like the light theme.
        MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
        MuiButton: { defaultProps: { disableElevation: true } },
        // Menus and popovers: a hairline border instead of a heavy shadow.
        MuiPopover: {
            styleOverrides: {
                paper: { border: "1px solid var(--lr-border)", boxShadow: "0 8px 24px rgba(15, 20, 25, 0.10)" },
            },
        },
        MuiDialog: { styleOverrides: { paper: { borderRadius: 16, border: "1px solid var(--lr-border)" } } },
        MuiTooltip: {
            styleOverrides: {
                tooltip: { backgroundColor: "var(--lr-text-primary)", color: "var(--lr-surface)", fontSize: 12, fontWeight: 500, borderRadius: 6 },
                arrow: { color: "var(--lr-text-primary)" },
            },
        },
        // The brand red marks the selected tab; its label stays blue.
        MuiTabs: { styleOverrides: { indicator: { backgroundColor: "var(--lr-accent)", height: 3, borderRadius: "3px 3px 0 0" } } },
        MuiTab: { styleOverrides: { root: { textTransform: "none", fontWeight: 600 } } },
    },
});
