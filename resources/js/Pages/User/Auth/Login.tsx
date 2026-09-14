import { Box, Stack, Typography, Link as MuiLink } from "@mui/material";
import { Form } from "@inertiajs/react";
import StyledButton from "../../../components/utils/StyledButton";
import StyledTextField from "../../../components/utils/StyledTextField";

export default function Login() {
    return (
        <Box
            sx={{
                display: "flex",
                minHeight: "100vh",
                width: "100%",
                justifyContent: "center",
                alignItems: "center",
                gap: { xs: 0, md: 6 },
                flexDirection: { xs: "column", md: "row" },
                backgroundImage: "url(/assets/background.png)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                px: { xs: 2, md: 0 },
            }}
        >
            {/* LEFT SIDE — LOGIN CARD */}
            <Box
                sx={{
                    width: { xs: "100%", sm: 380, md: 410 },
                    maxWidth: "100%",
                    borderRadius: 4,
                    p: { xs: 4, md: 5 },
                    background: "rgba(255, 255, 255, 0.85)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border: "1px solid rgba(255, 255, 255, 0.7)",
                    boxShadow: "0 4px 24px rgba(60,64,67,.22)",
                }}
            >
                {/* LOGO */}
                <Box
                    sx={{
                        mb: 3,
                        display: "flex",
                        justifyContent: "center",
                        width: "100%",
                    }}
                >
                    <img
                        src="/assets/lr-logo.svg"
                        alt="Leuterio Realty"
                        style={{
                            width: 170,
                            maxWidth: "100%",
                            height: "auto",
                        }}
                    />
                </Box>

                <Typography
                    sx={{
                        fontSize: 24,
                        fontWeight: 500,
                        textAlign: "center",
                        color: "#202124",
                        mb: 0.5,
                    }}
                >
                    Welcome back
                </Typography>

                <Typography
                    variant="body2"
                    sx={{ textAlign: "center", color: "#5f6368", mb: 3.5 }}
                >
                    Sign in to your LR Portal account
                </Typography>

                <Form action="/login-attempt" method="post">
                    {({ processing, errors }) => (
                        <Stack gap={2}>
                            {errors.email && (
                                <Box
                                    sx={{
                                        backgroundColor: "#fce8e6",
                                        borderRadius: 2,
                                        px: 2,
                                        py: 1,
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        sx={{ color: "#d93025" }}
                                    >
                                        Invalid email or password.
                                    </Typography>
                                </Box>
                            )}

                            {/* EMAIL */}
                            <Box>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: "#5f6368",
                                        fontWeight: 500,
                                        ml: 0.5,
                                        mb: 0.5,
                                        display: "block",
                                    }}
                                >
                                    Email address
                                </Typography>
                                <StyledTextField
                                    name="email"
                                    placeholder="you@example.com"
                                    error={errors.email ?? null}
                                />
                            </Box>

                            {/* PASSWORD */}
                            <Box>
                                <Box
                                    sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        mb: 0.5,
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: "#5f6368",
                                            fontWeight: 500,
                                            ml: 0.5,
                                        }}
                                    >
                                        Password
                                    </Typography>
                                    <MuiLink
                                        href="/forgot-password"
                                        sx={{
                                            fontSize: 12,
                                            color: "#1a73e8",
                                            textDecoration: "none",
                                            ":hover": {
                                                textDecoration: "underline",
                                            },
                                        }}
                                    >
                                        Forgot password?
                                    </MuiLink>
                                </Box>
                                <StyledTextField
                                    name="password"
                                    type="password"
                                    placeholder="Enter your password"
                                />
                            </Box>

                            <StyledButton
                                type="submit"
                                variant="contained"
                                loading={processing}
                                fullWidth
                                sx={{
                                    mt: 1,
                                    py: 1.1,
                                    backgroundColor: "#1a73e8",
                                    ":hover": { backgroundColor: "#1765cc" },
                                }}
                            >
                                Sign In
                            </StyledButton>
                        </Stack>
                    )}
                </Form>
            </Box>

            {/* RIGHT SIDE — HERO IMAGE */}
            <Box
                sx={{
                    width: 800,
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
    );
}
