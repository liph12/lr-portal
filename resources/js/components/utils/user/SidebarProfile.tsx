import { Box, Divider, Typography, Link as MuiLink } from "@mui/material";
import { NoteAddRounded } from "@mui/icons-material";
import { Link } from "@inertiajs/react";
import { hasAnyPermission, RECORD_PERMISSIONS } from "../../../helpers/permissions";
import StyledButton from "../StyledButton";
import useAuthUser from "../../../hooks/useAuthUser";
import UserAvatar from "./UserAvatar";

const linkSx = { fontSize: 13, fontWeight: 500, color: "var(--lr-text-body)", textDecoration: "none", ":hover": { color: "var(--lr-primary)", textDecoration: "underline" } };

export default function SidebarProfile() {
    const user = useAuthUser();

    if (!user) return null;

    return (
        <Box sx={{ flexShrink: 0 }}>
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    px: 3,
                    pt: 3,
                    pb: 2,
                }}
            >
                {/* Minimal: a large photo, the name and the role; the email lives on the profile. */}
                <Link href="/profile" aria-label="Edit profile" style={{ borderRadius: "50%", textDecoration: "none" }}>
                    <UserAvatar
                        name={user.name}
                        src={user.avatar}
                        size={104}
                        sx={{
                            boxShadow: "0 0 0 3px var(--lr-primary-soft-strong)",
                            transition: "box-shadow 0.15s",
                            ":hover": { boxShadow: "0 0 0 3px var(--lr-primary)" },
                        }}
                    />
                </Link>
                <Typography sx={{ mt: 1.75, fontSize: 18, fontWeight: 700, color: "var(--lr-text-primary)", lineHeight: 1.3, overflowWrap: "anywhere" }}>
                    {user.name}
                </Typography>
                <Typography variant="caption" sx={{ mt: 0.25, fontSize: 13, fontWeight: 500, color: "var(--lr-text-secondary)", lineHeight: 1.6 }}>
                    {user.role}
                    {user.agent_id && (
                        <>
                            {user.role && " · "}
                            <MuiLink component={Link} href={`/agents/${user.agent_id}`} sx={linkSx}>
                                My profile
                            </MuiLink>
                        </>
                    )}
                </Typography>
                {hasAnyPermission(user.permissions, RECORD_PERMISSIONS) && (
                    <StyledButton
                        variant="contained"
                        fullWidth
                        startIcon={<NoteAddRounded />}
                        LinkComponent={Link}
                        href="/dashboard/record-sale"
                        sx={{
                            mt: 2,
                            py: 1,
                            backgroundColor: "var(--lr-primary)",
                            color: "var(--lr-on-primary)",
                            fontWeight: 600,
                            ":hover": { backgroundColor: "var(--lr-primary-hover)" },
                        }}
                    >
                        Record Your Sale
                    </StyledButton>
                )}
            </Box>
            <Divider sx={{ borderColor: "var(--lr-border)", mx: 3 }} />
        </Box>
    );
}
