import { Box, Typography, TextField, Chip, Autocomplete } from "@mui/material";

export interface MyFormData {
    professions: string[];
    hobbies: string[];
    degrees: string[];
    school: string;
    skills: string;
    workExperience: string;
    about: string;
    references: string;
}

interface Stepper4Props {
    formData: MyFormData;
    handleChange: (field: keyof MyFormData, value: string | string[]) => void;
}

const PROFESSIONS = [
    "Accountant",
    "Actor/Actress",
    "Architect",
    "Artist",
    "Athlete",
    "Author/Writer",
    "Barista",
    "Chef",
    "Civil Engineer",
    "Computer Programmer/Developer",
    "Consultant",
    "Data Analyst",
    "Data Scientist",
    "Dentist",
    "Designer (Graphic, UI/UX, Fashion)",
    "Doctor",
    "Economist",
    "Electrical Engineer",
    "Entrepreneur",
    "Fashion Designer",
    "Financial Analyst",
    "Fitness Trainer",
    "Game Developer",
    "Graphic Designer",
    "Human Resources Specialist",
    "Journalist",
    "Lawyer",
    "Librarian",
    "Marketing Specialist",
    "Mechanical Engineer",
    "Medical Technologist",
    "Musician",
    "Nurse",
    "Nutritionist/Dietitian",
    "Occupational Therapist",
    "Pharmacist",
    "Photographer",
    "Pilot",
    "Physical Therapist",
    "Politician",
    "Professor/Teacher",
    "Psychologist",
    "Scientist",
    "Social Worker",
    "Software Engineer",
    "Student",
    "Teacher",
    "Technician",
    "Translator/Interpreter",
    "Travel Agent",
    "Veterinarian",
    "Web Developer",
    "Yoga Instructor",
    "Event Planner",
    "Public Relations Specialist",
];

const HOBBIES = [
    "Reading",
    "Traveling",
    "Gaming",
    "Cooking",
    "Baking",
    "Photography",
    "Music",
    "Singing",
    "Playing Musical Instruments",
    "Dancing",
    "Writing",
    "Journaling",
    "Swimming",
    "Hiking",
    "Drawing",
    "Painting",
    "Sketching",
    "Meditation",
    "Yoga",
    "Coding",
    "Gardening",
    "Cycling",
    "Running",
    "Jogging",
    "Birdwatching",
    "Fishing",
    "Camping",
    "Knitting",
    "Sewing",
    "Pottery",
    "Origami",
    "Travel Blogging",
    "Vlogging",
    "Blogging",
    "Collecting Stamps",
    "Collecting Coins",
    "Collecting Action Figures",
    "Martial Arts",
    "Rock Climbing",
    "Surfing",
    "Skiing",
    "Snowboarding",
    "Skateboarding",
    "Archery",
    "Playing Board Games",
    "Chess",
    "Puzzle Solving",
    "Magic Tricks",
    "Calligraphy",
    "DIY Crafts",
    "Model Building",
    "Astronomy",
    "Star Gazing",
    "Volunteering",
    "Birdwatching",
    "Language Learning",
    "Podcasting",
    "Travel Photography",
    "Food Tasting",
    "Mixology",
    "Decorating",
    "Home Brewing",
    "Watching Movies",
    "Watching TV Series",
    "Anime",
    "Cosplay",
    "Gaming (PC/Console)",
    "Esports",
    "Role-Playing Games",
    "Sketch Comedy",
    "Improv",
    "Travel Planning",
    "Horse Riding",
    "Swimming Competitions",
    "Running Marathons",
    "Triathlons",
    "Surfing Competitions",
    "Drone Flying",
    "Car Restoration",
    "Motorbike Riding",
    "Bird Training",
    "Pet Care",
    "Aquarium Keeping",
];

const DEGREES = [
    "Bachelor of Science in Accountancy (BSA)",
    "Bachelor of Science in Business Administration (BSBA)",
    "Bachelor of Science in Information Technology (BSIT)",
    "Bachelor of Science in Computer Science (BSCS)",
    "Bachelor of Science in Nursing (BSN)",
    "Bachelor of Science in Civil Engineering (BSCE)",
    "Bachelor of Science in Mechanical Engineering (BSME)",
    "Bachelor of Science in Electrical Engineering (BSEE)",
    "Bachelor of Science in Architecture (BSA)",
    "Bachelor of Science in Psychology (BSPsych)",
    "Bachelor of Arts in Communication (AB Comm)",
    "Bachelor of Arts in Political Science (AB PolSci)",
    "Bachelor of Secondary Education (BSEd)",
    "Bachelor of Elementary Education (BEEd)",
    "Bachelor of Science in Tourism Management (BSTM)",
    "Bachelor of Science in Hospitality Management (BSHM)",
    "Bachelor of Science in Criminology (BS Crim)",
    "Bachelor of Science in Marketing Management (BSMM)",
    "Bachelor of Science in Entrepreneurship (BSEntrep)",
    "Bachelor of Science in Environmental Science (BSES)",
    "Master of Business Administration (MBA)",
    "Master of Science in Information Technology (MSIT)",
    "Master of Arts in Education (MAEd)",
];

export default function Stepper4({ formData, handleChange }: Stepper4Props) {
    const renderMultiSelect = (
        label: string,
        field: "professions" | "hobbies" | "degrees",
        options: string[],
    ) => (
        <Box>
            <Typography mb={1} fontSize={16}>
                {label} <span style={{ color: "#d32f2f" }}>*</span>
            </Typography>

            <Autocomplete
                multiple
                options={options}
                value={formData[field]}
                onChange={(_, newValue) => handleChange(field, newValue)}
                disableCloseOnSelect
                renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                        <Chip
                            {...getTagProps({ index })}
                            key={option}
                            label={option}
                            size="small"
                        />
                    ))
                }
                renderInput={(params) => (
                    <TextField
                        {...params}
                        placeholder={`Select ${label.toLowerCase()}`}
                        fullWidth
                    />
                )}
            />
        </Box>
    );

    return (
        <Box
            sx={{
                width: "100%",
                maxWidth: 1150,
                mx: "auto",
                mt: 4,
                display: "grid",
                gap: 5,
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                alignItems: "start",
                gridAutoRows: "auto",
            }}
        >
            {renderMultiSelect("Professions", "professions", PROFESSIONS)}
            {renderMultiSelect("Hobbies", "hobbies", HOBBIES)}
            {renderMultiSelect("Degree / Course", "degrees", DEGREES)}

            <Box>
                <Typography mb={1} fontSize={16}>
                    School / College <span style={{ color: "#d32f2f" }}>*</span>
                </Typography>
                <TextField
                    fullWidth
                    value={formData.school}
                    onChange={(e) => handleChange("school", e.target.value)}
                />
            </Box>

            <Box>
                <Typography mb={1} fontSize={16}>
                    Skills <span style={{ color: "#d32f2f" }}>*</span>
                </Typography>
                <TextField
                    fullWidth
                    value={formData.skills}
                    onChange={(e) => handleChange("skills", e.target.value)}
                />
            </Box>

            <Box>
                <Typography mb={1} fontSize={16}>
                    Work Experience (Optional)
                </Typography>
                <TextField
                    fullWidth
                    value={formData.workExperience}
                    onChange={(e) =>
                        handleChange("workExperience", e.target.value)
                    }
                />
            </Box>

            <Box>
                <Typography mb={1} fontSize={16}>
                    About Yourself (Optional)
                </Typography>
                <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={formData.about}
                    onChange={(e) => handleChange("about", e.target.value)}
                />
            </Box>

            <Box>
                <Typography mb={1} fontSize={16}>
                    Contact & References{" "}
                    <span style={{ color: "#d32f2f" }}>*</span>
                </Typography>
                <TextField
                    fullWidth
                    value={formData.references}
                    onChange={(e) => handleChange("references", e.target.value)}
                />
            </Box>
        </Box>
    );
}
