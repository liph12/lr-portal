import { ReactElement } from "react";
import { Box, Typography } from "@mui/material";
import { BlockRounded, CloudOffRounded, SearchOffRounded } from "@mui/icons-material";
import { Link } from "@inertiajs/react";
import AppLayout from "../components/layouts/AppLayout";
import StyledButton from "../components/utils/StyledButton";
import useAuthUser from "../hooks/useAuthUser";

interface ErrorPageProps {
    status: number;
}

const COPY: Record<number, { title: string; message: string; Icon: typeof BlockRounded }> = {
    403: { title: "You don't have access to this page", message: "This area belongs to another role, or your role doesn't have the permission it needs.", Icon: BlockRounded },
    404: { title: "Page not found", message: "The link may be broken, or the page may have moved.", Icon: SearchOffRounded },
    500: { title: "Something went wrong", message: "Please try again in a moment. If it keeps happening, let your administrator know.", Icon: CloudOffRounded },
    503: { title: "Down for maintenance", message: "LR Portal will be back shortly.", Icon: CloudOffRounded },
};

function ErrorPage({ status }: ErrorPageProps) {
    const user = useAuthUser();
    const { title, message, Icon } = COPY[status] ?? COPY[500];

    return (
        <Box
            sx={{
                minHeight: user ? "100%" : "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                px: 3,
                py: 8,
                backgroundColor: "var(--lr-surface)",
            }}
        >
            <Box
                sx={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--lr-text-secondary)",
                    backgroundColor: "var(--lr-surface-container)",
                    mb: 2.5,
                }}
            >
                <Icon sx={{ fontSize: 36 }} />
            </Box>
            <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)", fontFamily: "Google Sans Code", letterSpacing: 1 }}>
                ERROR {status}
            </Typography>
            <Typography sx={{ mt: 1, fontSize: { xs: 22, sm: 26 }, color: "var(--lr-text-primary)" }}>{title}</Typography>
            <Typography variant="body2" sx={{ mt: 1, maxWidth: 440, color: "var(--lr-text-secondary)" }}>
                {message}
            </Typography>
            <StyledButton
                variant="contained"
                LinkComponent={Link}
                href={user?.home ?? "/login"}
                sx={{ mt: 3, px: 3, backgroundColor: "var(--lr-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } }}
            >
                {user ? "Go to my dashboard" : "Go to sign in"}
            </StyledButton>
        </Box>
    );
}

// Signed-in visitors keep their sidebar and navbar; guests (and unmatched URLs, which have no session) get a bare page.
ErrorPage.layout = (page: ReactElement<{ auth?: unknown }>) => (page.props.auth ? <AppLayout children={page} /> : page);

export default ErrorPage;
