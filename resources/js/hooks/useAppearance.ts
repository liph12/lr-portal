import { useEffect } from "react";
import { useColorScheme } from "@mui/material/styles";
import useAuthUser from "./useAuthUser";
import { applyFontSize } from "../helpers/appearance";

// Applies Settings › Preferences' theme and text size, so every device follows the account.
export default function useAppearance() {
    const preferences = useAuthUser()?.preferences;
    const { mode, setMode } = useColorScheme();
    const theme = preferences?.theme ?? null;
    const fontSize = preferences?.font_size ?? "default";

    const ready = mode !== undefined;

    // Only when the saved choice changes (or the scheme is first known); the navbar switch saves its own change first.
    useEffect(() => {
        if (ready && theme && theme !== mode) setMode(theme);
    }, [theme, ready]);

    useEffect(() => applyFontSize(fontSize), [fontSize]);
}
