import { Avatar, Box, Divider, Typography } from "@mui/material";
import { NoteAddRounded } from "@mui/icons-material";
import { Link } from "@inertiajs/react";
import StyledButton from "../StyledButton";
import useAuthUser from "../../../hooks/useAuthUser";
import { getAvatarColor, getInitials } from "../../../helpers/userAvatar";

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
                <Avatar
                    alt={user.name}
                    sx={{
                        width: 72,
                        height: 72,
                        fontSize: 28,
                        fontWeight: 500,
                        backgroundColor: getAvatarColor(user.name),
                        border: "3px solid var(--lr-surface)",
                        boxShadow: "0 1px 3px rgba(60,64,67,.3)",
                    }}
                >
                    {getInitials(user.name)}
                </Avatar>
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
                <StyledButton
                    variant="contained"
                    fullWidth
                    startIcon={<NoteAddRounded />}
                    LinkComponent={Link}
                    href="/superadmin/dashboard/record-sale"
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
            </Box>
            <Divider sx={{ borderColor: "var(--lr-border)", mx: 3 }} />
        </Box>
    );
}
