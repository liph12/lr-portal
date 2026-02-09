import {
    createContext,
    useContext,
    ReactNode,
    useState,
    useEffect,
} from "react";
import { useMediaQuery } from "@mui/material";
import { ThemeProvider, createTheme, useTheme } from "@mui/material/styles";
import { CreateSaleCompletedSteps } from "../types";
import "../../css/app.css";

interface AppContextType {
    desktop: boolean;
    createSaleCompletedSteps: CreateSaleCompletedSteps;
    handleUpdateCreateSaleCompletedSteps: <
        K extends keyof CreateSaleCompletedSteps
    >(
        completed: boolean,
        key: K
    ) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const AppProvider = ({ children }: { children: ReactNode }) => {
    const theme = useTheme();
    const desktop = useMediaQuery(theme.breakpoints.up("lg"));
    const [createSaleCompletedSteps, setCreateSaleCompletedSteps] =
        useState<CreateSaleCompletedSteps>({
            clientDetails: false,
            property: false,
            uploadPOT: false,
        });

    const handleUpdateCreateSaleCompletedSteps = <
        K extends keyof CreateSaleCompletedSteps
    >(
        completed: boolean,
        key: K
    ) => {
        setCreateSaleCompletedSteps((prevState) => ({
            ...prevState,
            [key]: completed,
        }));
    };

    return (
        <AppContext.Provider
            value={{
                desktop,
                createSaleCompletedSteps,
                handleUpdateCreateSaleCompletedSteps,
            }}
        >
            {children}
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
