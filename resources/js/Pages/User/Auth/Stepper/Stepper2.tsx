import { Box, Typography, TextField } from "@mui/material";

interface Stepper2Props {
    formData: any;
    handleChange: (field: string, value: string) => void;
}

export default function Stepper2({ formData, handleChange }: Stepper2Props) {
    return (
        <Box
            sx={{
                width: "100%",
                maxWidth: 1150,
                mx: "auto",
                mt: 4,
                display: "grid",
                gap: 5,
                gridTemplateColumns: {
                    xs: "1fr",
                    md: "repeat(3, 1fr)",
                },
            }}
        >
            {/* TEL. NUMBER (OPTIONAL) */}
            <Box>
                <Typography mb={1} fontSize={16}>
                    Tel. Number
                </Typography>
                <TextField
                    name="telNumber"
                    placeholder="Tel. Number"
                    value={formData.telNumber || ""}
                    onChange={(e) => handleChange("telNumber", e.target.value)}
                    sx={{ width: "100%" }}
                />
            </Box>

            {/* MOBILE NUMBER */}
            <Box>
                <Typography mb={1} fontSize={16}>
                    Mobile Number <span style={{ color: "#d32f2f" }}>*</span>
                </Typography>
                <TextField
                    name="mobileNumber"
                    placeholder="Mobile Number"
                    value={formData.mobileNumber}
                    onChange={(e) => handleChange("mobileNumber", e.target.value)}
                    sx={{ width: "100%" }}
                    required
                />
            </Box>

            {/* EMAIL */}
            <Box>
                <Typography mb={1} fontSize={16}>
                    Email <span style={{ color: "#d32f2f" }}>*</span>
                </Typography>
                <TextField
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    sx={{ width: "100%" }}
                    required
                />
            </Box>

            {/* TIN (OPTIONAL) */}
            <Box>
                <Typography mb={1} fontSize={16}>
                    TIN
                </Typography>
                <TextField
                    name="tin"
                    placeholder="TIN"
                    value={formData.tin || ""}
                    onChange={(e) => handleChange("tin", e.target.value)}
                    sx={{ width: "100%" }}
                />
            </Box>

            {/* FACEBOOK LINK */}
            <Box>
                <Typography mb={1} fontSize={16}>
                    Facebook Link <span style={{ color: "#d32f2f" }}>*</span>
                </Typography>
                <TextField
                    name="facebook"
                    placeholder="Facebook Link"
                    value={formData.facebook}
                    onChange={(e) => handleChange("facebook", e.target.value)}
                    sx={{ width: "100%" }}
                    required
                />
            </Box>
        </Box>
    );
}