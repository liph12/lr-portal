import { MouseEvent, useState } from "react";
import {
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Tooltip,
} from "@mui/material";
import {
    CheckRounded,
    DarkModeOutlined,
    LightModeOutlined,
    SettingsBrightnessOutlined,
} from "@mui/icons-material";
import { useColorScheme } from "@mui/material/styles";

type Mode = "light" | "dark" | "system";

const MODES: { value: Mode; label: string; icon: typeof LightModeOutlined }[] = [
    { value: "light", label: "Light", icon: LightModeOutlined },
    { value: "dark", label: "Dark", icon: DarkModeOutlined },
    { value: "system", label: "System default", icon: SettingsBrightnessOutlined },
];

export default function ThemeModeToggle() {
    const { mode, systemMode, setMode } = useColorScheme();
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);

    const resolved = mode === "system" ? systemMode : mode;
    const ButtonIcon = resolved === "dark" ? DarkModeOutlined : LightModeOutlined;

    const handleSelect = (value: Mode) => {
        setMode(value);
        setAnchor(null);
    };

    return (
        <>
            <Tooltip title="Appearance">
                <IconButton
                    aria-label="Change appearance"
                    onClick={(e: MouseEvent<HTMLElement>) => setAnchor(e.currentTarget)}
                    sx={{ color: "var(--lr-text-secondary)" }}
                >
                    <ButtonIcon />
                </IconButton>
            </Tooltip>
            <Menu
                anchorEl={anchor}
                open={Boolean(anchor)}
                onClose={() => setAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{
                    paper: {
                        sx: {
                            mt: 0.5,
                            minWidth: 200,
                            borderRadius: 3,
                            border: "1px solid var(--lr-border)",
                            boxShadow: "0 2px 6px rgba(0,0,0,.15)",
                        },
                    },
                }}
            >
                {MODES.map((m) => (
                    <MenuItem
                        key={m.value}
                        selected={mode === m.value}
                        onClick={() => handleSelect(m.value)}
                        sx={{ fontSize: 14 }}
                    >
                        <ListItemIcon>
                            <m.icon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                            primary={m.label}
                            slotProps={{ primary: { sx: { fontSize: 14 } } }}
                        />
                        {mode === m.value && (
                            <CheckRounded
                                fontSize="small"
                                sx={{ ml: 1, color: "var(--lr-primary)" }}
                            />
                        )}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
}
