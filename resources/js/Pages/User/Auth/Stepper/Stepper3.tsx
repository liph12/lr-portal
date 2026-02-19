import { Box, Typography, TextField, MenuItem } from "@mui/material";

interface Stepper3Props {
    formData: any;
    handleChange: (field: string, value: string) => void;
}

export default function Stepper3({ formData, handleChange }: Stepper3Props) {
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
            {/* COUNTRY */}
            <Box>
                <Typography mb={1} fontSize={16}>
                    Country <span style={{ color: "#d32f2f" }}>*</span>
                </Typography>
                <TextField
                    name="country"
                    select
                    value={formData.country}
                    onChange={(e) => handleChange("country", e.target.value)}
                    sx={{ width: "100%" }}
                    required
                >
                    <MenuItem value="">Select Country</MenuItem>
                    <MenuItem value="Philippines">Philippines</MenuItem>
                    <MenuItem value="USA">USA</MenuItem>
                    <MenuItem value="Canada">Canada</MenuItem>
                </TextField>
            </Box>

            {/* PROVINCE */}
            <Box>
                <Typography mb={1} fontSize={16}>
                    Province <span style={{ color: "#d32f2f" }}>*</span>
                </Typography>
                <TextField
                    name="province"
                    placeholder="Province"
                    value={formData.province}
                    onChange={(e) => handleChange("province", e.target.value)}
                    sx={{ width: "100%" }}
                    required
                />
            </Box>

            {/* CITY */}
            <Box>
                <Typography mb={1} fontSize={16}>
                    City <span style={{ color: "#d32f2f" }}>*</span>
                </Typography>
                <TextField
                    name="city"
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    sx={{ width: "100%" }}
                    required
                />
            </Box>

            {/* BARANGAY */}
            <Box>
                <Typography mb={1} fontSize={16}>
                    Barangay <span style={{ color: "#d32f2f" }}>*</span>
                </Typography>
                <TextField
                    name="barangay"
                    placeholder="Barangay"
                    value={formData.barangay}
                    onChange={(e) => handleChange("barangay", e.target.value)}
                    sx={{ width: "100%" }}
                    required
                />
            </Box>

            {/* POSTAL CODE */}
            <Box>
                <Typography mb={1} fontSize={16}>
                    Postal Code <span style={{ color: "#d32f2f" }}>*</span>
                </Typography>
                <TextField
                    name="postalCode"
                    placeholder="Postal Code"
                    value={formData.postalCode}
                    onChange={(e) => handleChange("postalCode", e.target.value)}
                    sx={{ width: "100%" }}
                    required
                />
            </Box>

            {/* ADDRESS */}
            <Box>
                <Typography mb={1} fontSize={16}>
                    Address <span style={{ color: "#d32f2f" }}>*</span>
                </Typography>
                <TextField
                    name="address"
                    placeholder="Street, House No., etc."
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    sx={{ width: "100%" }}
                    required
                />
            </Box>
        </Box>
    );
}