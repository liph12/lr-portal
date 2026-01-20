import { Box, Stack, Typography } from "@mui/material";
import { Form } from "@inertiajs/react";

import StyledTextField from "../../../components/utils/StyledTextField";
import StyledButton from "../../../components/utils/StyledButton";

export default function Login() {
    return (
        <Box
            sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
            }}
        >
            <Box sx={{ width: 400 }}>
                <Form action="/login-attempt" method="post">
                    {({ processing, errors }) => (
                        <Stack gap={2}>
                            {errors.email && (
                                <Typography
                                    sx={{ my: 1 }}
                                    color="error"
                                    variant="body2"
                                >
                                    Invalid Credentials
                                </Typography>
                            )}
                            <StyledTextField placeholder="Email" name="email" />
                            <StyledTextField
                                type="password"
                                placeholder="Password"
                                name="password"
                            />
                            {}
                            <StyledButton
                                type="submit"
                                variant="contained"
                                loading={processing}
                            >
                                Login
                            </StyledButton>
                        </Stack>
                    )}
                </Form>
            </Box>
        </Box>
    );
}
