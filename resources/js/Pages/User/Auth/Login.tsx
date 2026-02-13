import { Box, Stack, Typography } from "@mui/material";
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
                    width: { xs: "100%", sm: 380, md: 400 },
                    maxWidth: "100%",
                    borderRadius: 2,
                    p: { xs: 4, md: 6 },
                    textAlign: "center",
                    background: "rgba(255, 255, 255, 0.1)",
                    backdropFilter: "blur(15px)",
                    WebkitBackdropFilter: "blur(15px)",
                    border: "1px solid rgba(255, 255, 255, 0.6)",
                    boxShadow: 1,
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
                            width: 180,
                            maxWidth: "100%",
                            height: "auto",
                        }}
                    />
                </Box>

                <Typography
                    variant="h5"
                    fontWeight={600}
                    sx={{ mb: 1, color: "#000" }}
                >
                    Welcome back!
                </Typography>

                <Typography variant="body2" sx={{ mb: 4, color: "#000" }}>
                    Sign in to your account
                </Typography>

                <Form action="/login-attempt" method="post">
                    {({ processing, errors }) => (
                        <Stack gap={2}>
                            {errors.email && (
                                <Typography color="error" variant="body2">
                                    Invalid credentials
                                </Typography>
                            )}

                            {/* EMAIL */}
                            <StyledTextField
                                name="email"
                                placeholder="Email address"
                            />

                            {/* PASSWORD */}
                            <StyledTextField
                                name="password"
                                type="password"
                                placeholder="Password"
                            />

                            <StyledButton
                                type="submit"
                                variant="contained"
                                loading={processing}
                                sx={{ mt: 1 }}
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
