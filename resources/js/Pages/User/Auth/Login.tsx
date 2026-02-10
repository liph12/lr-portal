import { Box, Stack, Typography, TextField } from "@mui/material";
import { Form } from "@inertiajs/react";
import StyledButton from "../../../components/utils/StyledButton";

export default function Login() {
    return (
        // 🌐 FULL SCREEN WRAPPER — background image
        <Box
            sx={{
                display: "flex",
                minHeight: "100vh",
                width: "100%",
                justifyContent: "center",
                alignItems: "center",
                gap: { xs: 0, md: 6 },
                flexDirection: { xs: "column", md: "row" }, // 📱 stack on mobile
                backgroundImage: "url(/assets/login-background.png)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                px: { xs: 2, md: 0 }, // mobile padding
            }}
        >
            {/* LEFT SIDE — LOGIN CARD */}
            <Box
                sx={{
                    width: { xs: "100%", sm: 380, md: 400 },
                    maxWidth: "100%",
                    borderRadius: 2,
                    p: { xs: 4, md: 6 }, // smaller padding on mobile
                    textAlign: "center",
                    background: "rgba(255, 255, 255, 0.1)",
                    backdropFilter: "blur(15px)",
                    WebkitBackdropFilter: "blur(15px)",
                    border: "1px solid rgba(255, 255, 255, 0.6)",
                    boxShadow: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center", // center all content horizontally
                }}
            >
                {/* LR LOGO */}
                <Box
                    sx={{
                        mb: 3,
                        display: "flex",
                        justifyContent: "center", // horizontally center
                        alignItems: "center",     // vertically center
                        width: "100%",
                        height: 120,              // ✅ height for centering logo
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

                {/* LOGIN FORM */}
                <Form action="/login-attempt" method="post">
                    {({ processing, errors }) => (
                        <Stack gap={2}>
                            {errors.email && (
                                <Typography color="error" variant="body2">
                                    Invalid credentials
                                </Typography>
                            )}

                            <TextField
                                name="email"
                                placeholder="Email address"
                                fullWidth
                                variant="outlined"
                                InputProps={{
                                    style: {
                                        backgroundColor: "#fff",
                                        border: "1px solid rgba(0,0,0,0.4)",
                                        borderRadius: 4,
                                    },
                                }}
                            />

                            <TextField
                                name="password"
                                type="password"
                                placeholder="Password"
                                fullWidth
                                variant="outlined"
                                InputProps={{
                                    style: {
                                        backgroundColor: "#fff",
                                        border: "1px solid rgba(0,0,0,0.4)",
                                        borderRadius: 4,
                                    },
                                }}
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

            {/* RIGHT SIDE — HERO IMAGE (HIDDEN ON MOBILE) */}
            <Box
                sx={{
                    width: 800,
                    display: { xs: "none", md: "block" }, // 🚫 hide on mobile
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
