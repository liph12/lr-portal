import { createContext, useContext, ReactNode } from "react";
import { useMediaQuery } from "@mui/material";
import { ThemeProvider, useTheme } from "@mui/material/styles";
import { appTheme } from "./appTheme";
import "../../css/app.css";

interface AppContextType {
    desktop: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const AppProvider = ({ children }: { children: ReactNode }) => {
    const theme = useTheme();
    const desktop = useMediaQuery(theme.breakpoints.up("lg"));

    return (
        <AppContext.Provider
            value={{ desktop }}
        >
            <ThemeProvider
                theme={appTheme}
                defaultMode="light"
                modeStorageKey="lr-theme-mode"
                disableTransitionOnChange
            >
                {children}
            </ThemeProvider>
        </AppContext.Provider>
    );
};

const useAppProvider = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error("useAppProvider must be used within a AppProvider");
    }
    return context;
};

export { AppProvider, useAppProvider };
