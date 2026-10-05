import { useState } from "react";
import {
    Box,
    Typography,
    Stepper,
    Step,
    StepLabel,
    Link,
    StepIconProps,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";

import AppLogo from "../../../../components/utils/AppLogo";
import StyledButton from "../../../../components/utils/StyledButton";
import Stepper1 from "./Stepper1";
import Stepper2 from "./Stepper2";
import Stepper3 from "./Stepper3";
import Stepper4 from "./Stepper4";

// ----------------------
// Shared form interface
// ----------------------
export interface FullFormData {
    // Step 1
    firstName: string;
    middleName: string;
    lastName: string;
    sex: string;
    birthDate: string;
    status: string;
    citizenship: string;

    // Step 2
    telNumber: string;
    mobileNumber: string;
    email: string;
    tin: string;
    facebook: string;

    // Step 3
    country: string;
    province: string;
    city: string;
    barangay: string;
    postalCode: string;
    address: string;

    // Step 4
    professions: string[];
    hobbies: string[];
    degrees: string[];
    school: string;
    skills: string;
    workExperience: string;
    about: string;
    references: string;
}

const steps = [
    "Basic Information",
    "Contacts & Socials",
    "Complete Address",
    "Personal Background",
];

// ----------------------
// Stepper Icon
// ----------------------
function CustomStepIcon(props: StepIconProps) {
    const { active = false, icon } = props;
    return (
        <motion.div
            animate={{
                scale: active ? 1.3 : 1,
                backgroundColor: active ? "#d32f2f" : "var(--lr-outline)",
            }}
            transition={{ duration: 0.3 }}
            style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
            }}
        >
            {icon}
        </motion.div>
    );
}

// ----------------------
// Main Component
// ----------------------
export default function CreateAccount() {
    const [activeStep, setActiveStep] = useState(0);

    const [formData, setFormData] = useState<FullFormData>({
        // Step 1
        firstName: "Joseph",
        middleName: "Untag",
        lastName: "Amores",
        sex: "Male",
        birthDate: "11/25/1999",
        status: "Single",
        citizenship: "Filipino",

        // Step 2
        telNumber: "N/A",
        mobileNumber: "09945200122",
        email: "kokoyflores112@gmail.com",
        tin: "N/A",
        facebook: "Facebook.com/kokoyflores112",

        // Step 3
        country: "Philippines",
        province: "Cebu",
        city: "Mandaue City",
        barangay: "Banilad",
        postalCode: "6014",
        address: "Banilad Mandaue City Cebu",

        // Step 4
        professions: [],
        hobbies: [],
        degrees: [],
        school: "",
        skills: "",
        workExperience: "",
        about: "",
        references: "",
    });

    // ----------------------
    // Handle change
    // ----------------------
    const handleChange = (
        field: keyof FullFormData,
        value: string | string[],
    ) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    // ----------------------
    // Validation per step
    // ----------------------
    const requiredFields: Record<number, (keyof FullFormData)[]> = {
        0: [
            "firstName",
            "lastName",
            "sex",
            "birthDate",
            "status",
            "citizenship",
        ],
        1: ["mobileNumber", "email"],
        2: ["country", "province", "city", "barangay", "postalCode", "address"],
        3: [], // Step 4 optional
    };

    const isStepValid = () => {
        const fields = requiredFields[activeStep];
        return fields.every((field) => {
            const value = formData[field];
            if (Array.isArray(value)) return value.length > 0;
            return value.trim() !== "";
        });
    };

    // ----------------------
    // Step navigation
    // ----------------------
    const handleNext = () => {
        if (!isStepValid()) return;
        if (activeStep < steps.length - 1) setActiveStep((prev) => prev + 1);
        else {
            console.log("Final Form Data:", formData);
            window.location.href = "/createpassword";
        }
    };

    const handleBack = () => {
        if (activeStep > 0) setActiveStep((prev) => prev - 1);
    };

    // ----------------------
    // Stepper components
    // ----------------------
    const stepComponents = [
        <Stepper1 key={0} formData={formData} handleChange={handleChange} />,
        <Stepper2 key={1} formData={formData} handleChange={handleChange} />,
        <Stepper3 key={2} formData={formData} handleChange={handleChange} />,
        <Stepper4 key={3} formData={formData} handleChange={handleChange} />,
    ];

    // ----------------------
    // Render
    // ----------------------
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
                    position: "relative",
                    px: { xs: 2, sm: 3 },
                    py: { xs: 2, md: 8 },
                }}
            >
                {/* Logo + sign in link — in flow below md so they can't collide with each other or the title */}
                <Box
                    sx={{
                        position: { xs: "static", md: "absolute" },
                        top: { md: 30 },
                        left: { md: 40 },
                        right: { md: 40 },
                        width: { xs: "100%", md: "auto" },
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: { xs: "center", md: "flex-start" },
                        justifyContent: "space-between",
                        columnGap: 2,
                        rowGap: 1,
                    }}
                >
                    <AppLogo
                        sx={{
                            width: { xs: 96, sm: 120, md: 140 },
                            height: "auto",
                        }}
                    />

                    <Typography
                        fontWeight={500}
                        sx={{ fontSize: { xs: 14, sm: 15 } }}
                    >
                        Already have an account?{" "}
                        <Link
                            href="/login"
                            sx={{
                                color: "var(--lr-error)",
                                textDecoration: "none",
                                fontWeight: 600,
                            }}
                        >
                            Sign in
                        </Link>
                    </Typography>
                </Box>

                <Box sx={{ width: "100%", maxWidth: 1200 }}>
                    {/* Title */}
                    <Box
                        textAlign="center"
                        sx={{ mt: { xs: 3, md: 4 }, mb: { xs: 3, md: 4 } }}
                    >
                        <Typography
                            fontWeight={500}
                            sx={{ fontSize: { xs: 26, sm: 32, md: 36 } }}
                        >
                            Create Account
                        </Typography>
                    </Box>

                    {/* Stepper */}
                    <Stepper
                        activeStep={activeStep}
                        alternativeLabel
                        sx={{
                            mb: { xs: 3, sm: 5 },
                            "& .MuiStep-root": { px: { xs: 0.5, sm: 1 } },
                            "& .MuiStepLabel-label": {
                                fontSize: { xs: 11, sm: 14 },
                                overflowWrap: "anywhere",
                            },
                        }}
                    >
                        {steps.map((label) => (
                            <Step key={label}>
                                <StepLabel StepIconComponent={CustomStepIcon}>
                                    {label}
                                </StepLabel>
                            </Step>
                        ))}
                    </Stepper>

                    {/* Step content */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeStep}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.5 }}
                        >
                            {stepComponents[activeStep]}
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation buttons */}
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            gap: { xs: 2, sm: 3 },
                            py: 4,
                        }}
                    >
                        <StyledButton
                            variant="outlined"
                            onClick={handleBack}
                            disabled={activeStep === 0}
                            sx={{
                                flex: { xs: 1, sm: "0 0 auto" },
                                py: { xs: 1.25, sm: 0.75 },
                            }}
                        >
                            ← BACK
                        </StyledButton>

                        <StyledButton
                            variant="contained"
                            onClick={handleNext}
                            disabled={!isStepValid()}
                            sx={{
                                flex: { xs: 1, sm: "0 0 auto" },
                                py: { xs: 1.25, sm: 0.75 },
                            }}
                        >
                            {activeStep === steps.length - 1 ? "SUBMIT" : "NEXT →"}
                        </StyledButton>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
