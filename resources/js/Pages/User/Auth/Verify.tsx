import { Box, Stack, Typography } from "@mui/material";
import { Form, Link } from "@inertiajs/react";
import AppLogo from "../../../components/utils/AppLogo";
import StyledButton from "../../../components/utils/StyledButton";
import StyledTextField from "../../../components/utils/StyledTextField";

export default function Verification() {
    return (
        <Box
            sx={{
                height: "100vh",
                "@supports (height: 100dvh)": { height: "100dvh" },
                // Self-scrolling: outside AppLayout, and html/body may be overflow-locked
                overflowY: "auto",
                backgroundImage: "var(--lr-auth-bg)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
            }}
        >
            <Box
                sx={{
                    minHeight: "100%",
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    px: { xs: 2, sm: 3 },
                    pt: { xs: 2, sm: 16 },
                    pb: { xs: 4, sm: 16 },
                    position: "relative",
                }}
            >
                {/* LOGO + SIGN IN LINK — in flow on phones so they can't overlap each other or the card */}
                <Box
                    sx={{
                        position: { xs: "static", sm: "absolute" },
                        top: { sm: 16 },
                        left: { sm: 16 },
                        right: { sm: 16 },
                        width: { xs: "100%", sm: "auto" },
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: { xs: "center", sm: "flex-start" },
                        justifyContent: "space-between",
                        columnGap: 2,
                        rowGap: 1,
                        mb: { xs: 3, sm: 0 },
                    }}
                >
                    <AppLogo
                        sx={{ width: { xs: 96, sm: 160 }, height: "auto" }}
                    />

                    <Typography variant="body2">
                        Already have an account?{" "}
                        <Link href="/login" style={{ textDecoration: "none" }}>
                            <Typography
                                component="span"
                                sx={{
                                    fontWeight: 600,
                                    color: "primary.main",
                                    transition: "0.3s",
                                    "&:hover": {
                                        color: "secondary.main",
                                        textDecoration: "underline",
                                    },
                                }}
                            >
                                Sign in here
                            </Typography>
                        </Link>
                    </Typography>
                </Box>

                <Box
                    sx={{
                        flex: 1,
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <Typography
                        variant="h4"
                        fontWeight={700}
                        sx={{
                            mb: { xs: 3, sm: 4 },
                            textAlign: "center",
                            color: "var(--lr-text-primary)",
                            fontSize: { xs: "1.5rem", sm: "2rem", md: "2.5rem" },
                            lineHeight: 1.2,
                        }}
                    >
                        Email Verification
                    </Typography>

                    {/* MAIN CONTENT */}
                    <Box
                        sx={{
                            display: "flex",
                            gap: { xs: 0, md: 6 },
                            flexDirection: { xs: "column", md: "row" },
                            alignItems: "center",
                            width: "100%",
                            justifyContent: "center",
                        }}
                    >
                        {/* VERIFICATION CARD */}
                        <Box
                            sx={{
                                width: { xs: "100%", sm: 400, md: 450 },
                                maxWidth: "100%",
                                flexShrink: 0,
                                borderRadius: 2,
                                p: { xs: 3, sm: 4, md: 6 },
                                background: "rgba(255, 255, 255, 0.1)",
                                backdropFilter: "blur(15px)",
                                WebkitBackdropFilter: "blur(15px)",
                                border: "1px solid var(--lr-glass-border)",
                            }}
                        >
                            {/* SPONSOR SECTION */}
                            <Box
                                sx={{
                                    mb: 3,
                                    p: { xs: 2, sm: 3 },
                                    borderRadius: 2,
                                    background: "rgba(25, 118, 210, 0.08)",
                                    border: "1px solid rgba(25, 118, 210, 0.3)",
                                    borderLeft: "6px solid",
                                    borderLeftColor: "primary.main",
                                }}
                            >
                                <Typography
                                    variant="overline"
                                    sx={{
                                        fontWeight: 700,
                                        color: "primary.main",
                                        letterSpacing: 1,
                                        fontSize: { xs: 10, sm: 12 },
                                    }}
                                >
                                    SPONSOR
                                </Typography>

                                <Typography
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                        fontWeight: 700,
                                        fontSize: { xs: 14, sm: 18 },
                                        mt: 0.5,
                                    }}
                                >
                                    <Box
                                        component="img"
                                        src="/assets/ph_flag.png"
                                        alt="Philippine Flag"
                                        sx={{
                                            width: { xs: 20, sm: 30 },
                                            height: { xs: 10, sm: 15 },
                                            objectFit: "cover",
                                            borderRadius: 0.5,
                                        }}
                                    />
                                    Philip M. Libres
                                </Typography>

                                <Typography
                                    sx={{
                                        mt: 1,
                                        fontSize: { xs: 12, sm: 14 },
                                        overflowWrap: "anywhere",
                                    }}
                                >
                                    ✉ libresphilip14@gmail.com
                                </Typography>

                                <Typography
                                    sx={{ mt: 0.5, fontSize: { xs: 12, sm: 14 } }}
                                >
                                    📞 09677705320
                                </Typography>
                            </Box>

                            {/* VERIFICATION TEXT */}
                            <Typography
                                sx={{
                                    fontWeight: 700,
                                    fontSize: { xs: "1.1rem", sm: "1.25rem" },
                                    mb: 1,
                                }}
                            >
                                Enter Verification Code
                            </Typography>

                            <Typography
                                sx={{
                                    fontWeight: 500,
                                    fontSize: "0.85rem",
                                    mb: 2,
                                }}
                            >
                                Please enter the verification code sent to your email.
                            </Typography>

                            {/* FORM */}
                            <Form action="/createaccount" method="get">
                                <Stack gap={2}>
                                    <StyledTextField
                                        name="verification_code"
                                        placeholder="Verification Code"
                                    />

                                    <StyledButton
                                        type="submit"
                                        variant="contained"
                                        sx={{ mt: 1 }}
                                    >
                                        Proceed
                                    </StyledButton>
                                </Stack>
                            </Form>
                        </Box>

                        {/* HERO IMAGE */}
                        <Box
                            sx={{
                                flex: "0 1 800px",
                                minWidth: 0,
                                display: { xs: "none", md: "block" },
                                textAlign: "center",
                                overflow: "hidden",
                                img: {
                                    width: "100%",
                                    height: "auto",
                                    display: "block",
                                    animation: "introLaptop 1.2s ease-out forwards",
                                    opacity: 0,
                                },
                                "@keyframes introLaptop": {
                                    "0%": {
                                        opacity: 0,
                                        transform: "translateY(40px) scale(0.95)",
                                    },
                                    "100%": {
                                        opacity: 1,
                                        transform: "translateY(0) scale(1)",
                                    },
                                },
                            }}
                        >
                            <img src="/assets/lr-laptop.png" alt="Hero Mockup" />
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
