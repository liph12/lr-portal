import { ReactNode } from "react";
import { Box, Container, Typography } from "@mui/material";
import { ConstructionRounded } from "@mui/icons-material";
import { Link } from "@inertiajs/react";
import AppLayout from "../../components/layouts/AppLayout";
import StyledButton from "../../components/utils/StyledButton";

interface UnderConstructionProps {
    // The section's name, as in the menu.
    title: string;
    // What it will hold, in a sentence.
    description: string;
}

// Shown for a menu section whose content isn't built yet (Accounting, Human Resource, Inbox…).
function UnderConstruction({ title, description }: UnderConstructionProps) {
    return (
        <Container maxWidth="sm" sx={{ py: { xs: 6, sm: 10 } }}>
            <Box sx={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <Box
                    sx={{
                        width: 88,
                        height: 88,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--lr-warning)",
                        backgroundColor: "var(--lr-warning-soft)",
                    }}
                >
                    <ConstructionRounded sx={{ fontSize: 44 }} />
                </Box>
                <Box>
                    <Typography variant="overline" sx={{ color: "var(--lr-warning)", fontWeight: 600, letterSpacing: 1 }}>
                        Under construction
                    </Typography>
                    <Typography component="h1" sx={{ fontSize: { xs: 24, sm: 28 }, color: "var(--lr-text-primary)" }}>
                        {title}
                    </Typography>
                </Box>
                <Typography variant="body1" sx={{ color: "var(--lr-text-secondary)", maxWidth: 420 }}>
                    {description} We're still building this section; it will appear here once it's ready.
                </Typography>
                <Link href="/dashboard/main" style={{ textDecoration: "none" }}>
                    <StyledButton variant="contained" sx={{ px: 3, mt: 1, backgroundColor: "var(--lr-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } }}>
                        Back to dashboard
                    </StyledButton>
                </Link>
            </Box>
        </Container>
    );
}

UnderConstruction.layout = (page: ReactNode) => <AppLayout children={page} />;

export default UnderConstruction;
