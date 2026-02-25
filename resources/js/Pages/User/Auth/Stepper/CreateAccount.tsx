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

const steps = [
    "Basic Information",
    "Contacts & Socials",
    "Complete Address",
    "Personal Background",
];

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

export default function CreateAccount() {
    const [activeStep, setActiveStep] = useState(0);

    const [formData, setFormData] = useState({
        // Step 1
        firstName: "",
        middleName: "", // optional
        lastName: "",
        sex: "",
        birthDate: "",
        status: "",
        citizenship: "",

        // Step 2
        telNumber: "", // optional
        mobileNumber: "",
        email: "",
        tin: "", // optional
        facebook: "", // optional

        // Step 3
        country: "",
        province: "",
        city: "",
        barangay: "",
        postalCode: "",
        address: "",

        // Step 4 (all optional example)
        professions: "",
        hobbies: "",
        school: "",
        degree: "",
        skills: "",
        workExperience: "",
        about: "",
        references: "",
    });

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    // ✅ Required fields per step
    const requiredFields: Record<number, string[]> = {
        0: ["firstName", "lastName", "sex", "birthDate", "status", "citizenship"],
        1: ["mobileNumber", "email"],
        2: ["country", "province", "city", "barangay", "postalCode", "address"],
        3: [], 
    };

    // ✅ Check if current step is valid
    const isStepValid = () => {
        const fields = requiredFields[activeStep];
        return fields.every((field) => formData[field as keyof typeof formData].trim() !== "");
    };

    const handleNext = () => {
        if (!isStepValid()) return;

        if (activeStep < steps.length - 1) {
            setActiveStep((prev) => prev + 1);
        } else {
            window.location.href = "/createpassword";
        }
    };

    const handleBack = () => {
        if (activeStep > 0) setActiveStep((prev) => prev - 1);
    };

    const stepComponents = [
        <Stepper1 formData={formData} handleChange={handleChange} />,
        <Stepper2 formData={formData} handleChange={handleChange} />,
        <Stepper3 formData={formData} handleChange={handleChange} />,
        <Stepper4 formData={formData} handleChange={handleChange} />,
    ];

    return (
        <Box
            sx={{
                minHeight: "100vh",
                backgroundImage: "url(/assets/background.png)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                px: 3,
            }}
        >
            {/* LOGO */}
            <Box
                component="img"
                src="/assets/lr-logo.svg"
                alt="LR Logo"
                sx={{
                    position: "absolute",
                    top: 30,
                    left: 40,
                    width: 140,
                }}
            />

            {/* SIGN IN */}
            <Box
                sx={{
                    position: "absolute",
                    top: 30,
                    right: 40,
                }}
            >
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
                <Box textAlign="center" mt={10} mb={4}>
                    <Typography fontSize={36} fontWeight={500}>
                        Create Account
                    </Typography>
                </Box>

                <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 5 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel StepIconComponent={CustomStepIcon}>
                                {label}
                            </StepLabel>
                        </Step>
                    ))}
                </Stepper>

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