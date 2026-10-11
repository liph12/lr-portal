import { Box, Divider, Typography, Link as MuiLink } from "@mui/material";
import { NoteAddRounded } from "@mui/icons-material";
import { Link } from "@inertiajs/react";
import { hasAnyPermission, RECORD_PERMISSIONS } from "../../../helpers/permissions";
import StyledButton from "../StyledButton";
import useAuthUser from "../../../hooks/useAuthUser";
import UserAvatar from "./UserAvatar";

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
                <Link href="/profile" aria-label="Edit profile" style={{ borderRadius: "50%" }}>
                    <UserAvatar
                        name={user.name}
                        src={user.avatar}
                        size={72}
                        sx={{
                            border: "3px solid var(--lr-surface)",
                            boxShadow: "0 1px 3px rgba(60,64,67,.3)",
                            transition: "box-shadow 0.15s",
                            ":hover": { boxShadow: "0 0 0 3px var(--lr-primary-soft-strong)" },
                        }}
                    />
                </Link>
                <Typography
                    sx={{
                        mt: 1.5,
                        fontSize: 16,
                        fontWeight: 500,
                        color: "var(--lr-text-primary)",
                        lineHeight: 1.3,
                        overflowWrap: "anywhere",
                    }}
                >
                    {user.name}
                </Typography>
                {user.role && (
                    <Box
                        sx={{
                            mt: 0.75,
                            px: 1.25,
                            py: 0.25,
                            borderRadius: 99,
                            backgroundColor: "var(--lr-primary-soft)",
                            color: "var(--lr-primary)",
                        }}
                    >
                        <Typography variant="caption" sx={{ fontWeight: 500 }}>
                            {user.role}
                        </Typography>
                    </Box>
                )}
                <Typography
                    variant="caption"
                    sx={{ mt: 0.5, color: "var(--lr-text-secondary)", overflowWrap: "anywhere" }}
                >
                    {user.email}
                </Typography>
                <MuiLink
                    component={Link}
                    href="/profile"
                    sx={{
                        mt: 0.5,
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--lr-primary)",
                        textDecoration: "none",
                        ":hover": { textDecoration: "underline" },
                    }}
                >
                    Edit profile
                </MuiLink>
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
                            boxShadow: "0 1px 3px rgba(26,115,232,.35)",
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
