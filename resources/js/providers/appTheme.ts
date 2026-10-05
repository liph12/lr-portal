import { createTheme } from "@mui/material/styles";

// Mirrors the --lr-* tokens in resources/css/app.css; MUI needs literal colors to derive hover/alpha shades.
export const appTheme = createTheme({
    cssVariables: { colorSchemeSelector: "class" },
    colorSchemes: {
        light: {
            palette: {
                primary: { main: "#1a73e8", dark: "#1765cc", contrastText: "#ffffff" },
                error: { main: "#d93025" },
                success: { main: "#1e8e3e" },
                background: { default: "#ffffff", paper: "#ffffff" },
                text: { primary: "#202124", secondary: "#5f6368" },
                divider: "#e8eaed",
            },
        },
        dark: {
            palette: {
                primary: { main: "#a8c7fa", dark: "#c2d7fb", contrastText: "#062e6f" },
                error: { main: "#f28b82" },
                success: { main: "#81c995" },
                background: { default: "#1f1f1f", paper: "#1f1f1f" },
                text: { primary: "#e8eaed", secondary: "#9aa0a6" },
                divider: "#3c4043",
            },
        },
    },
    components: {
        // Dark-mode Paper adds a white elevation overlay; surfaces here are flat like the light theme.
        MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    },
});
