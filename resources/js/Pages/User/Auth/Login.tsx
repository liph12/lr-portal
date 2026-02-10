import { Box, Stack, Typography, Button, TextField } from "@mui/material";
import { Form } from "@inertiajs/react";
import StyledButton from "../../../components/utils/StyledButton";

export default function Login() {
    return (
        // 🌐 FULL SCREEN WRAPPER — background image
        <Box
            sx={{
                display: "flex",
                height: "100vh",
                width: "100%",
                justifyContent: "center",
                alignItems: "center",
                gap: 6,
                backgroundImage: "url(/assets/login-background.png)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
            }}
        >
            {/* =====================================================
                LEFT SIDE — LOGIN CARD (GLASS EFFECT)
               ===================================================== */}
            <Box
                sx={{
                    width: 400,
                    borderRadius: 2,
                    p: 6,
                    textAlign: "center",
                    flexShrink: 0,
                    background: "rgba(255, 255, 255, 0.1)", // glass effect
                    backdropFilter: "blur(15px)",
                    WebkitBackdropFilter: "blur(15px)",
                    border: "1px solid rgba(255, 255, 255, 0.6)", // visible border
                    boxShadow: 1, // subtle paper shadow
                }}
            >
                {/* LR-LOGO DETAIL */}
                <Box
                    sx={{
                        mb: 3,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <img
                        src="/assets/lr-logo.svg"
                        alt="Leuterio Realty"
                        style={{ width: 200, height: "auto" }}
                    />
                </Box>

                {/* TITLE */}
                <Typography
                    variant="h5"
                    fontWeight={600}
                    sx={{
                        mb: 1,
                        color: "#000",
                        fontFamily: "Inter, sans-serif",
                    }}
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

                            {/* EMAIL FIELD */}
                            <TextField
                                name="email"
                                placeholder="Email address"
                                fullWidth
                                variant="outlined"
                                InputProps={{
                                    style: {
                                        backgroundColor: "#fff", // white background
                                        border: "1px solid rgba(0,0,0,0.4)", // visible border
                                        borderRadius: 4,
                                    },
                                }}
                            />

                            {/* PASSWORD FIELD */}
                            <TextField
                                name="password"
                                type="password"
                                placeholder="Password"
                                fullWidth
                                variant="outlined"
                                InputProps={{
                                    style: {
                                        backgroundColor: "#fff", // white background
                                        border: "1px solid rgba(0,0,0,0.4)", // visible border
                                        borderRadius: 4,
                                    },
                                }}
                            />

                            {/* SIGN IN BUTTON */}
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

            {/*FOR THE LAPTOP AND PHONE BACKGROUND*/}
            <Box
    sx={{
        width: 800,
        maxWidth: "100%",
        flexShrink: 0,
        textAlign: "center",
        p: 0,
        borderRadius: 0,
        background: "transparent",
        boxShadow: "none",
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
    <img
        src="/assets/lr-laptop.png"
        alt="Hero Mockup"
    />
</Box>
        </Box>
    );
}
