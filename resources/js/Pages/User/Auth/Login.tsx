import { FormEvent, useState } from "react";
import {
    Box,
    Divider,
    IconButton,
    InputAdornment,
    Stack,
    Typography,
    Link as MuiLink,
} from "@mui/material";
import {
    ErrorOutlineRounded,
    InsightsRounded,
    NoteAddRounded,
    AppsRounded,
    VisibilityOffRounded,
    VisibilityRounded,
} from "@mui/icons-material";
import { Link, useForm } from "@inertiajs/react";
import StyledButton from "../../../components/utils/StyledButton";
import StyledTextField from "../../../components/utils/StyledTextField";
import AppLogo from "../../../components/utils/AppLogo";
import ThemeModeToggle from "../../../components/utils/ThemeModeToggle";
import HERO_IMAGE from "../../../../assets/lr-laptop.png";

interface LoginFormData {
    email: string;
    password: string;
}

const FEATURES = [
    { icon: NoteAddRounded, label: "Record and submit sales" },
    { icon: InsightsRounded, label: "Track team and agent statistics" },
    { icon: AppsRounded, label: "Access forms, IDs and tools" },
];

const labelSx = {
    color: "var(--lr-text-secondary)",
    fontWeight: 500,
    ml: 0.5,
    display: "block",
};

const linkSx = {
    fontSize: 12,
    fontWeight: 500,
    color: "var(--lr-primary)",
    textDecoration: "none",
    ":hover": { textDecoration: "underline" },
};

export default function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors } = useForm<LoginFormData>({
        email: "",
        password: "",
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post("/login-attempt", { onFinish: () => setData("password", "") });
    };

    return (
        <Box
            sx={{
                height: "100vh",
                "@supports (height: 100dvh)": { height: "100dvh" },
                // Self-scrolling: outside AppLayout, and html/body may be overflow-locked
                overflowY: "auto",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                backgroundColor: "var(--lr-surface)",
            }}
        >
            <Box
                component="header"
                sx={{
                    px: { xs: 2, sm: 3 },
                    py: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <AppLogo sx={{ width: 70 }} />
                <ThemeModeToggle />
            </Box>
            <Divider sx={{ borderColor: "var(--lr-border)" }} />

            <Box sx={{ flex: "1 0 auto", display: "flex" }}>
                <Box
                    sx={{
                        flex: { xs: 1, md: "0 0 480px", lg: "0 0 540px" },
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        px: { xs: 2, sm: 6 },
                        py: 6,
                    }}
                >
                    <Box sx={{ width: "100%", maxWidth: 380 }}>
                        <Typography
                            sx={{ fontSize: 28, fontWeight: 400, color: "var(--lr-text-primary)" }}
                        >
                            Sign in
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{ color: "var(--lr-text-secondary)", mt: 0.5, mb: 4 }}
                        >
                            Continue to your LR Portal account
                        </Typography>

                        <Box component="form" onSubmit={handleSubmit} noValidate>
                            <Stack gap={2.5}>
                                {errors.email && (
                                    <Box
                                        role="alert"
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                            backgroundColor: "var(--lr-error-soft)",
                                            color: "var(--lr-error)",
                                            borderRadius: 3,
                                            px: 2,
                                            py: 1.25,
                                        }}
                                    >
                                        <ErrorOutlineRounded fontSize="small" />
                                        <Typography variant="body2">
                                            Invalid email or password.
                                        </Typography>
                                    </Box>
                                )}

                                <Box>
                                    <Typography
                                        variant="caption"
                                        sx={{ ...labelSx, mb: 0.5 }}
                                    >
                                        Email address
                                    </Typography>
                                    <StyledTextField
                                        name="email"
                                        type="email"
                                        placeholder="you@leuteriorealty.com"
                                        value={data.email}
                                        handleChange={(e) =>
                                            setData("email", e.target.value)
                                        }
                                    />
                                </Box>

                                <Box>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            mb: 0.5,
                                        }}
                                    >
                                        <Typography variant="caption" sx={labelSx}>
                                            Password
                                        </Typography>
                                        <MuiLink
                                            component={Link}
                                            href="/password-reset"
                                            sx={linkSx}
                                        >
                                            Forgot password?
                                        </MuiLink>
                                    </Box>
                                    <StyledTextField
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your password"
                                        value={data.password}
                                        handleChange={(e) =>
                                            setData("password", e.target.value)
                                        }
                                        props={{
                                            slotProps: {
                                                input: {
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <IconButton
                                                                size="small"
                                                                edge="end"
                                                                aria-label={
                                                                    showPassword
                                                                        ? "Hide password"
                                                                        : "Show password"
                                                                }
                                                                onClick={() =>
                                                                    setShowPassword(
                                                                        (s) => !s
                                                                    )
                                                                }
                                                                sx={{ color: "var(--lr-text-secondary)" }}
                                                            >
                                                                {showPassword ? (
                                                                    <VisibilityOffRounded fontSize="small" />
                                                                ) : (
                                                                    <VisibilityRounded fontSize="small" />
                                                                )}
                                                            </IconButton>
                                                        </InputAdornment>
                                                    ),
                                                },
                                            },
                                        }}
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
                                        backgroundColor: "var(--lr-primary)",
                                        ":hover": { backgroundColor: "var(--lr-primary-hover)" },
                                    }}
                                >
                                    Sign in
                                </StyledButton>
                            </Stack>
                        </Box>

                        <Divider sx={{ borderColor: "var(--lr-border)", my: 3 }} />

                        <Typography
                            variant="body2"
                            sx={{ color: "var(--lr-text-secondary)", textAlign: "center" }}
                        >
                            New to LR Portal?{" "}
                            <MuiLink
                                component={Link}
                                href="/register"
                                sx={{ ...linkSx, fontSize: 14 }}
                            >
                                Create an account
                            </MuiLink>
                        </Typography>
                    </Box>
                </Box>

                <Box
                    sx={{
                        flex: 1,
                        display: { xs: "none", md: "flex" },
                        flexDirection: "column",
                        justifyContent: "center",
                        gap: 4,
                        px: { md: 6, lg: 10 },
                        py: 6,
                        backgroundColor: "var(--lr-surface-dim)",
                        borderLeft: "1px solid var(--lr-border)",
                        overflow: "hidden",
                    }}
                >
                    <Box>
                        <Typography
                            sx={{ fontSize: 28, fontWeight: 400, color: "var(--lr-text-primary)" }}
                        >
                            Welcome to LR Portal 👋
                        </Typography>
                        <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", mt: 0.5 }}>
                            Record your sale, manage and track statistics, access
                            tools and more.
                        </Typography>
                    </Box>

                    <Stack gap={1} sx={{ alignItems: "flex-start" }}>
                        {FEATURES.map((f) => (
                            <Box
                                key={f.label}
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.5,
                                    px: 2,
                                    py: 1,
                                    borderRadius: 99,
                                    backgroundColor: "var(--lr-primary-soft)",
                                    color: "var(--lr-primary)",
                                }}
                            >
                                <f.icon fontSize="small" />
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {f.label}
                                </Typography>
                            </Box>
                        ))}
                    </Stack>

                    <Box
                        component="img"
                        src={HERO_IMAGE}
                        alt="LR Portal dashboard on a laptop"
                        sx={{
                            width: "100%",
                            maxWidth: 680,
                            height: "auto",
                            opacity: 0,
                            animation: "introLaptop 1s ease-out forwards",
                            "@keyframes introLaptop": {
                                "0%": { opacity: 0, transform: "translateY(32px)" },
                                "100%": { opacity: 1, transform: "translateY(0)" },
                            },
                        }}
                    />
                </Box>
            </Box>
        </Box>
    );
}
