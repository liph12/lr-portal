import { useState, useEffect } from "react";
import {
    Box,
    Typography,
    TextField,
    InputAdornment,
    IconButton,
    Avatar,
} from "@mui/material";
import { Visibility, VisibilityOff, Person } from "@mui/icons-material";
import StyledButton from "../../../components/utils/StyledButton";

export default function CreatePassword() {
    const [email, setEmail] = useState("kokoyflores112@gmail.com");
    const [password, setPassword] = useState("123456");
    const [confirmPassword, setConfirmPassword] = useState("123456");
    const [showPassword, setShowPassword] = useState(false);
    const [isPasswordValid, setIsPasswordValid] = useState(false);

    const handleTogglePassword = () => setShowPassword((prev) => !prev);

    useEffect(() => {
        setIsPasswordValid(
            password.length >= 6 && password === confirmPassword
        );
    }, [password, confirmPassword]);

    const handleCreatePassword = () => {
        // Alert to show password created
        alert("Password successfully created!");
        // Redirect to login page
        window.location.href = "/login";
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
            }}
        >
            <Box
                sx={{
                    minHeight: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    px: { xs: 2, sm: 3 },
                    py: { xs: 4, sm: 6 },
                }}
            >
                <Box sx={{ width: "100%", maxWidth: 500, textAlign: "center" }}>
                    <Typography
                        variant="h4"
                        fontWeight={700}
                        mb={2}
                        color="textPrimary"
                        sx={{
                            textTransform: "none",
                            fontSize: { xs: "1.6rem", sm: "2.125rem" },
                            lineHeight: 1.2,
                        }}
                    >
                        Create Account Password
                    </Typography>

                    <Avatar
                        sx={{
                            m: "0 auto 30px",
                            bgcolor: "var(--lr-text-secondary)",
                            width: 56,
                            height: 56,
                        }}
                    >
                        <Person fontSize="large" />
                    </Avatar>

                    <form>
                        {/* Email Field */}
                        <Typography textAlign="left" fontWeight={500} mb={1}>
                            Email <span style={{ color: "red" }}>*</span>
                        </Typography>
                        <TextField
                            fullWidth
                            variant="filled"
                            value={email}
                            disabled
                            InputProps={{ disableUnderline: true }}
                            sx={{
                                mb: 3,
                                "& .MuiFilledInput-root": {
                                    borderRadius: 1,
                                    backgroundColor: "var(--lr-surface-container)",
                                },
                            }}
                        />

                        {/* Password Field */}
                        <Typography textAlign="left" fontWeight={500} mb={1}>
                            Password <span style={{ color: "red" }}>*</span>
                        </Typography>
                        <TextField
                            fullWidth
                            placeholder="Password"
                            type={showPassword ? "text" : "password"}
                            variant="filled"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            InputProps={{
                                disableUnderline: true,
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={handleTogglePassword}
                                            edge="end"
                                        >
                                            {showPassword ? (
                                                <VisibilityOff />
                                            ) : (
                                                <Visibility />
                                            )}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                mb: 3,
                                "& .MuiFilledInput-root": {
                                    borderRadius: 1,
                                    backgroundColor: "var(--lr-surface-container)",
                                },
                            }}
                        />

                        {/* Confirm Password Field */}
                        <Typography textAlign="left" fontWeight={500} mb={1}>
                            Confirm Password <span style={{ color: "red" }}>*</span>
                        </Typography>
                        <TextField
                            fullWidth
                            placeholder="Confirm Password"
                            type="password"
                            variant="filled"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            InputProps={{ disableUnderline: true }}
                            sx={{
                                mb: 1,
                                "& .MuiFilledInput-root": {
                                    borderRadius: 1,
                                    backgroundColor: "var(--lr-surface-container)",
                                },
                            }}
                        />

                        {/* Error Message */}
                        {password.length > 0 && password.length < 6 && (
                            <Typography
                                color="error"
                                variant="body2"
                                textAlign="left"
                                mb={2}
                            >
                                Password must be at least 6 characters.
                            </Typography>
                        )}

                        {/* Create Password Button */}
                        <StyledButton
                            type="button"
                            variant="contained"
                            fullWidth
                            disabled={!isPasswordValid}
                            sx={{
                                mt: 2,
                                py: 1.5,
                                backgroundColor: "primary.main",
                                color: "primary.contrastText",
                                boxShadow: "none",
                                "&:hover": { backgroundColor: "primary.dark" },
                            }}
                            onClick={handleCreatePassword}
                        >
                            create password
                        </StyledButton>
                    </form>

                    <Typography
                        variant="caption"
                        sx={{ mt: { xs: 5, sm: 8 }, display: "block", color: "var(--lr-text-secondary)" }}
                    >
                        LR Registration v3.1 | 2026 © All Rights Reserved
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}
