import { Box, Typography, MenuItem, TextField } from "@mui/material";

interface Stepper1Props {
    formData: any;
    handleChange: (field: string, value: string) => void;
}

export default function Stepper1({ formData, handleChange }: Stepper1Props) {
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
            {/* FIRST NAME */}
            <Box>
                <Typography mb={1} fontSize={16}>
                    First Name <span style={{ color: "#d32f2f" }}>*</span>
                </Typography>
                <TextField
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={(e) => handleChange("firstName", e.target.value)}
                    sx={{ width: "100%" }}
                    required
                />
            </Box>

            {/* Middle Name */}
            <Box>
                <Typography mb={1} fontSize={16}>
                    Middle Name <span style={{ color: "#d32f2f" }}>*</span>
                </Typography>
                <TextField
                    name="middleName"
                    placeholder="Middle Name"
                    value={formData.middleName}
                    onChange={(e) => handleChange("middleName", e.target.value)}
                    sx={{ width: "100%" }}
                    required
                />
            </Box>

            {/* LAST NAME */}
            <Box>
                <Typography mb={1} fontSize={16}>
                    Last Name <span style={{ color: "#d32f2f" }}>*</span>
                </Typography>
                <TextField
                    name="lastName"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={(e) => handleChange("lastName", e.target.value)}
                    sx={{ width: "100%" }}
                    required
                />
            </Box>

            {/* SEX */}
            <Box>
                <Typography mb={1} fontSize={16}>
                    Sex <span style={{ color: "#d32f2f" }}>*</span>
                </Typography>
                <TextField
                    name="sex"
                    select
                    value={formData.sex}
                    onChange={(e) => handleChange("sex", e.target.value)}
                    sx={{ width: "100%" }}
                    required
                >
                    <MenuItem value="">Sex</MenuItem>
                    <MenuItem value="male">Male</MenuItem>
                    <MenuItem value="female">Female</MenuItem>
                </TextField>
            </Box>

            {/* DATE OF BIRTH */}
            <Box>
                <Typography mb={1} fontSize={16}>
                    Date of Birth <span style={{ color: "#d32f2f" }}>*</span>
                </Typography>
                <TextField
                    name="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => handleChange("birthDate", e.target.value)}
                    sx={{ width: "100%" }}
                    required
                />
            </Box>

            {/* MARITAL STATUS */}
            <Box>
                <Typography mb={1} fontSize={16}>
                    Marital Status <span style={{ color: "#d32f2f" }}>*</span>
                </Typography>
                <TextField
                    name="status"
                    select
                    value={formData.status}
                    onChange={(e) => handleChange("status", e.target.value)}
                    sx={{ width: "100%" }}
                    required
                >
                    <MenuItem value="">Marital Status</MenuItem>
                    <MenuItem value="single">Single</MenuItem>
                    <MenuItem value="married">Married</MenuItem>
                </TextField>
            </Box>

            {/* CITIZENSHIP */}
            <Box>
                <Typography mb={1} fontSize={16}>
                    Citizenship <span style={{ color: "#d32f2f" }}>*</span>
                </Typography>
                <TextField
                    name="citizenship"
                    placeholder="Citizenship"
                    value={formData.citizenship}
                    onChange={(e) =>
                        handleChange("citizenship", e.target.value)
                    }
                    sx={{ width: "100%" }}
                    required
                />
            </Box>
        </Box>
    );
}
