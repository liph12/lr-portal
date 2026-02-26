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
                backgroundColor: active ? "#d32f2f" : "#c4c4c4",
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
                minHeight: "100vh",
                backgroundImage: "url(/assets/background.png)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                display: "flex",
                justifyContent: "center",
                position: "relative",
                px: 3,
                py: 8, // ✅ vertical spacing
                overflowY: "auto", // ✅ allow scrolling
                alignItems: "flex-start", // ✅ prevent collapsing
            }}
        >
            {/* Logo */}
            <Box
                component="img"
                src="/assets/lr-logo.svg"
                alt="LR Logo"
                sx={{ position: "absolute", top: 30, left: 40, width: 140 }}
            />

            {/* Sign in link */}
            <Box sx={{ position: "absolute", top: 30, right: 40 }}>
                <Typography fontSize={15} fontWeight={500}>
                    Already have an account?{" "}
                    <Link
                        href="/login"
                        sx={{
                            color: "#d32f2f",
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
                <Box textAlign="center" mt={4} mb={4}>
                    <Typography fontSize={36} fontWeight={500}>
                        Create Account
                    </Typography>
                </Box>

                {/* Stepper */}
                <Stepper
                    activeStep={activeStep}
                    alternativeLabel
                    sx={{ mb: 5 }}
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
                        gap: 3,
                        py: 4,
                    }}
                >
                    <StyledButton
                        variant="outlined"
                        onClick={handleBack}
                        disabled={activeStep === 0}
                    >
                        ← BACK
                    </StyledButton>

                    <StyledButton
                        variant="contained"
                        onClick={handleNext}
                        disabled={!isStepValid()}
                    >
                        {activeStep === steps.length - 1 ? "SUBMIT" : "NEXT →"}
                    </StyledButton>
                </Box>
            </Box>
        </Box>
    );
}
