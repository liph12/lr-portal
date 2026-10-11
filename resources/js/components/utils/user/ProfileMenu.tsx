import { MouseEvent, useState } from "react";
import { Box, ButtonBase, Divider, ListItemIcon, ListItemText, ListSubheader, Menu, MenuItem, Typography } from "@mui/material";
import { AccountCircleOutlined, LogoutRounded, SettingsOutlined, UndoRounded, VisibilityOutlined } from "@mui/icons-material";
import { router } from "@inertiajs/react";
import useAuthUser from "../../../hooks/useAuthUser";
import { leavePresence } from "../../../helpers/presence";
import UserAvatar from "./UserAvatar";

const itemTextSx = { primary: { sx: { fontSize: 14 } } };

export default function ProfileMenu() {
    const user = useAuthUser();
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const [signingOut, setSigningOut] = useState(false);

    if (!user) return null;

    const go = (path: string) => {
        setAnchor(null);
        router.visit(path);
    };

    const viewAs = (role: string | null) => {
        setAnchor(null);
        role ? router.post("/view-as", { role }) : router.delete("/view-as");
    };

    const signOut = () => {
        setAnchor(null);
        // Leave first so others see you go offline immediately, not when the socket times out.
        leavePresence();
        router.post("/logout", {}, { onStart: () => setSigningOut(true), onFinish: () => setSigningOut(false) });
    };

    return (
        <>
            <ButtonBase
                aria-label="Open profile menu"
                aria-haspopup="menu"
                aria-expanded={Boolean(anchor)}
                onClick={(e: MouseEvent<HTMLElement>) => setAnchor(e.currentTarget)}
                sx={{
                    ml: 0.5,
                    borderRadius: "50%",
                    ":focus-visible": { outline: "2px solid var(--lr-primary)", outlineOffset: 2 },
                }}
            >
                <UserAvatar name={user.name} src={user.avatar} size={36} />
            </ButtonBase>

            <Menu
                anchorEl={anchor}
                open={Boolean(anchor)}
                onClose={() => setAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{
                    paper: {
                        sx: {
                            mt: 1,
                            minWidth: 260,
                            maxWidth: 320,
                            borderRadius: 3,
                            border: "1px solid var(--lr-border)",
                            boxShadow: "0 4px 16px rgba(0,0,0,.12)",
                        },
                    },
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, pt: 1, pb: 1.5 }}>
                    <UserAvatar name={user.name} src={user.avatar} size={44} />
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: "var(--lr-text-primary)" }}>
                            {user.name}
                        </Typography>
                        <Typography
                            variant="caption"
                            sx={{ display: "block", color: "var(--lr-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        >
                            {user.email}
                        </Typography>
                        {user.role && (
                            <Typography variant="caption" sx={{ color: "var(--lr-primary)", fontWeight: 500 }}>
                                {user.role}
                            </Typography>
                        )}
                    </Box>
                </Box>
                <Divider sx={{ borderColor: "var(--lr-border)" }} />

                <MenuItem onClick={() => go("/profile")} sx={{ mt: 0.5 }}>
                    <ListItemIcon>
                        <AccountCircleOutlined fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Edit profile" slotProps={itemTextSx} />
                </MenuItem>
                {user.can.access_superadmin && (
                    <MenuItem onClick={() => go("/superadmin/settings")}>
                        <ListItemIcon>
                            <SettingsOutlined fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Settings" slotProps={itemTextSx} />
                    </MenuItem>
                )}

                {user.can.view_as && <Divider sx={{ borderColor: "var(--lr-border)" }} />}
                {user.can.view_as && user.viewing_as && (
                    <MenuItem onClick={() => viewAs(null)}>
                        <ListItemIcon>
                            <UndoRounded fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Return to Superadmin" slotProps={itemTextSx} />
                    </MenuItem>
                )}
                {user.can.view_as && (
                    <ListSubheader sx={{ lineHeight: "32px", fontSize: 12, backgroundColor: "transparent", color: "var(--lr-text-secondary)" }}>
                        View the portal as
                    </ListSubheader>
                )}
                {user.can.view_as &&
                    user.view_as_roles.map((r) => (
                        <MenuItem key={r.name} onClick={() => viewAs(r.name)} selected={user.viewing_as === r.label} dense>
                            <ListItemIcon>
                                <VisibilityOutlined fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary={r.label} slotProps={itemTextSx} />
                        </MenuItem>
                    ))}

                <Divider sx={{ borderColor: "var(--lr-border)" }} />
                <MenuItem onClick={signOut} disabled={signingOut} sx={{ color: "var(--lr-error)" }}>
                    <ListItemIcon sx={{ color: "inherit" }}>
                        <LogoutRounded fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={signingOut ? "Signing out…" : "Sign out"} slotProps={itemTextSx} />
                </MenuItem>
            </Menu>
        </>
    );
}
