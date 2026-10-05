import { useState } from "react";
import {
    Box,
    Stack,
    Typography,
    FormControlLabel,
    Checkbox,
    FormControl,
    FormHelperText,
    Link as MuiLink,
} from "@mui/material";
import { Form, Link } from "@inertiajs/react";
import EmailIcon from "@mui/icons-material/Email";
import AppLogo from "../../../components/utils/AppLogo";
import StyledButton from "../../../components/utils/StyledButton";
import StyledTextField from "../../../components/utils/StyledTextField";

export default function Register() {
    const [termsChecked, setTermsChecked] = useState(false);
    const [termsError, setTermsError] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        if (!termsChecked) {
            e.preventDefault();
            setTermsError(true);
        }
    };

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

                    <Typography variant="body2" sx={{ color: "var(--lr-text-body)" }}>
                        Already have an account?{" "}
                        <Link href="/login" style={{ textDecoration: "none" }}>
                            <Typography
                                component="span"
                                sx={{
                                    fontWeight: 500,
                                    color: "var(--lr-primary)",
                                    ":hover": { textDecoration: "underline" },
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
                        sx={{
                            mb: { xs: 3, sm: 4 },
                            textAlign: "center",
                            color: "var(--lr-text-primary)",
                            fontWeight: 500,
                            fontSize: { xs: "1.5rem", sm: "2rem", md: "2.25rem" },
                            lineHeight: 1.2,
                        }}
                    >
                        Sign up as a Salesperson
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
                        {/* REGISTER CARD */}
                        <Box
                            sx={{
                                width: { xs: "100%", sm: 400, md: 450 },
                                maxWidth: "100%",
                                flexShrink: 0,
                                borderRadius: 4,
                                p: { xs: 3, sm: 4, md: 5 },
                                background: "var(--lr-glass)",
                                backdropFilter: "blur(20px)",
                                WebkitBackdropFilter: "blur(20px)",
                                border: "1px solid var(--lr-glass-border)",
                                boxShadow: "0 4px 24px rgba(60,64,67,.22)",
                            }}
                        >
                            {/* SPONSOR SECTION */}
                            <Box
                                sx={{
                                    mb: 3,
                                    p: { xs: 2, sm: 2.5 },
                                    borderRadius: 3,
                                    backgroundColor: "var(--lr-primary-soft)",
                                    border: "1px solid var(--lr-primary-soft-strong)",
                                }}
                            >
                                <Typography
                                    variant="overline"
                                    sx={{
                                        fontWeight: 600,
                                        color: "var(--lr-primary)",
                                        letterSpacing: 1,
                                        fontSize: { xs: 10, sm: 11 },
                                    }}
                                >
                                    SPONSOR
                                </Typography>

                                <Typography
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                        fontWeight: 500,
                                        fontSize: { xs: 14, sm: 17 },
                                        color: "var(--lr-text-primary)",
                                        mt: 0.5,
                                    }}
                                >
                                    <Box
                                        component="img"
                                        src="/assets/ph_flag.png"
                                        alt="Philippine Flag"
                                        sx={{
                                            width: { xs: 20, sm: 28 },
                                            height: { xs: 10, sm: 14 },
                                            objectFit: "cover",
                                            borderRadius: 0.5,
                                        }}
                                    />
                                    Philip M. Libres
                                </Typography>

                                <Typography
                                    sx={{
                                        mt: 1,
                                        fontSize: { xs: 12, sm: 13 },
                                        color: "var(--lr-text-secondary)",
                                        overflowWrap: "anywhere",
                                    }}
                                >
                                    ✉ libresphilip14@gmail.com
                                </Typography>

                                <Typography
                                    sx={{
                                        mt: 0.5,
                                        fontSize: { xs: 12, sm: 13 },
                                        color: "var(--lr-text-secondary)",
                                    }}
                                >
                                    📞 09677705320
                                </Typography>
                            </Box>

                            {/* CREATE ACCOUNT */}
                            <Typography
                                sx={{
                                    fontWeight: 500,
                                    fontSize: { xs: "1.05rem", sm: "1.15rem" },
                                    color: "var(--lr-text-primary)",
                                    mb: 2,
                                }}
                            >
                                Create Account
                            </Typography>

                            {/* NATIONAL */}
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.5,
                                    mb: 2,
                                }}
                            >
                                <Box
                                    component="img"
                                    src="/assets/profile.png"
                                    alt="National Logo"
                                    sx={{
                                        width: 28,
                                        height: 28,
                                        objectFit: "cover",
                                        borderRadius: 0.5,
                                    }}
                                />
                                <Typography
                                    sx={{
                                        fontWeight: 500,
                                        fontSize: { xs: "1rem", sm: "1.1rem" },
                                        color: "var(--lr-text-body)",
                                    }}
                                >
                                    National
                                </Typography>
                            </Box>

                            <Form
                                action="/register-attempt"
                                method="post"
                                onSubmit={handleSubmit}
                                onSuccess={() => {
                                    window.location.href = "/verify";
                                }}
                            >
                                {({ processing }) => (
                                    <Stack gap={2}>
                                        <StyledTextField
                                            name="email"
                                            placeholder="Email Address"
                                            props={{
                                                InputProps: {
                                                    startAdornment: (
                                                        <Box
                                                            sx={{
                                                                mr: 1,
                                                                display: "flex",
                                                            }}
                                                        >
                                                            <EmailIcon
                                                                sx={{
                                                                    fontSize: 20,
                                                                    color: "var(--lr-text-secondary)",
                                                                }}
                                                            />
                                                        </Box>
                                                    ),
                                                },
                                            }}
                                        />

                                        <FormControl error={termsError}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={termsChecked}
                                                        onChange={(e) => {
                                                            setTermsChecked(
                                                                e.target.checked,
                                                            );
                                                            if (e.target.checked) {
                                                                setTermsError(false);
                                                            }
                                                        }}
                                                        name="terms"
                                                        sx={{
                                                            color: "var(--lr-text-secondary)",
                                                            "&.Mui-checked": {
                                                                color: "var(--lr-primary)",
                                                            },
                                                        }}
                                                    />
                                                }
                                                label={
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ color: "var(--lr-text-body)" }}
                                                    >
                                                        I agree to the{" "}
                                                        <MuiLink
                                                            href="#"
                                                            sx={{
                                                                color: "var(--lr-primary)",
                                                                textDecoration: "none",
                                                                ":hover": {
                                                                    textDecoration:
                                                                        "underline",
                                                                },
                                                            }}
                                                        >
                                                            terms and conditions
                                                        </MuiLink>{" "}
                                                        of the LR Contract and the
                                                        website.
                                                    </Typography>
                                                }
                                            />
                                            {termsError && (
                                                <FormHelperText
                                                    sx={{ color: "var(--lr-error)" }}
                                                >
                                                    You must agree to the terms and
                                                    conditions.
                                                </FormHelperText>
                                            )}
                                        </FormControl>

                                        <StyledButton
                                            type="submit"
                                            variant="contained"
                                            loading={processing}
                                            disabled={!termsChecked || processing}
                                            fullWidth
                                            sx={{
                                                mt: 1,
                                                py: 1.1,
                                                backgroundColor: "var(--lr-primary)",
                                                ":hover": {
                                                    backgroundColor: "var(--lr-primary-hover)",
                                                },
                                            }}
                                        >
                                            Proceed
                                        </StyledButton>
                                    </Stack>
                                )}
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
