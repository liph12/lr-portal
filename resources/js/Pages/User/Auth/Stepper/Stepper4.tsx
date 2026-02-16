import { Box, Typography, TextField } from "@mui/material";

interface Stepper4Props {
    formData: any;
    handleChange: (field: string, value: string) => void;
}

export default function Stepper4({ formData, handleChange }: Stepper4Props) {
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
            {/* PROFESSIONAL */}
            <Box>
                <Typography mb={1} fontSize={16}>
                    Professions <span style={{ color: "#d32f2f" }}>*</span>
                </Typography>
                <TextField
                    name="professions"
                    placeholder="Professions"
                    value={formData.professions}
                    onChange={(e) =>
                        handleChange("professions", e.target.value)
                    }
                    sx={{ width: "100%" }}
                    required
                />
            </Box>

            {/* HOBBIES */}
            <Box>
                <Typography mb={1} fontSize={16}>
                    Hobbies <span style={{ color: "#d32f2f" }}>*</span>
                </Typography>
                <TextField
                    name="hobbies"
                    placeholder="Hobbies"
                    value={formData.hobbies}
                    onChange={(e) => handleChange("hobbies", e.target.value)}
                    sx={{ width: "100%" }}
                    required
                />
            </Box>

            {/* SCHOOL / COLLEGE */}
            <Box>
                <Typography mb={1} fontSize={16}>
                    School / College <span style={{ color: "#d32f2f" }}>*</span>
                </Typography>
                <TextField
                    name="school"
                    placeholder="School / College"
                    value={formData.school}
                    onChange={(e) => handleChange("school", e.target.value)}
                    sx={{ width: "100%" }}
                    required
                />
            </Box>

            {/* DEGREE / COURSE */}
            <Box>
                <Typography mb={1} fontSize={16}>
                    Degree / Course <span style={{ color: "#d32f2f" }}>*</span>
                </Typography>
                <TextField
                    name="degree"
                    placeholder="Degree / Course"
                    value={formData.degree}
                    onChange={(e) => handleChange("degree", e.target.value)}
                    sx={{ width: "100%" }}
                    required
                />
            </Box>

            {/* SKILLS*/}
            <Box>
                <Typography mb={1} fontSize={16}>
                    Skills <span style={{ color: "#d32f2f" }}>*</span>
                </Typography>
                <TextField
                    name="skills"
                    placeholder="Skills"
                    value={formData.skills}
                    onChange={(e) => handleChange("skills", e.target.value)}
                    sx={{ width: "100%" }}
                    required
                />
            </Box>

            {/* WORK EXPERIENCE (OPTIONAL) */}
            <Box>
                <Typography mb={1} fontSize={16}>
                    Work Experience (Optional)
                </Typography>
                <TextField
                    name="workExperience"
                    placeholder="Work Experience"
                    value={formData.workExperience || ""}
                    onChange={(e) =>
                        handleChange("workExperience", e.target.value)
                    }
                    sx={{ width: "100%" }}
                />
            </Box>

            {/* ABOUT YOURSELF (OPTIONAL, AI GENERATED) */}
            <Box>
                <Typography mb={1} fontSize={16}>
                    About Yourself (Optional, AI Generated)
                </Typography>
                <TextField
                    name="about"
                    placeholder="About Yourself"
                    multiline
                    rows={3}
                    value={formData.about || ""}
                    onChange={(e) => handleChange("about", e.target.value)}
                    sx={{ width: "100%" }}
                />
            </Box>

            {/* CONTACT & REFERENCES */}
            <Box>
                <Typography mb={1} fontSize={16}>
                    Contact & References{" "}
                    <span style={{ color: "#d32f2f" }}>*</span>
                </Typography>
                <TextField
                    name="references"
                    placeholder="Contact & References"
                    value={formData.references}
                    onChange={(e) => handleChange("references", e.target.value)}
                    sx={{ width: "100%" }}
                    required
                />
            </Box>
        </Box>
    );
}
