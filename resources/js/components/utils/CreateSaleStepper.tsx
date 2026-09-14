import Box from "@mui/material/Box";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";

interface CreateSaleStepperProps {
    activeStep: number;
    steps: Array<string>;
}

export default function CreateSaleStepper({
    activeStep,
    steps,
}: CreateSaleStepperProps) {
    return (
        <Box sx={{ width: "100%", my: 3 }}>
            <Stepper activeStep={activeStep} alternativeLabel={false}>
                {steps.map((label, index) => {
                    const isActive = index === activeStep;
                    const isCompleted = index < activeStep;

                    return (
                        <Step key={label}>
                            <StepLabel
                                StepIconProps={{
                                    sx: {
                                        fontSize: 24,
                                        color: "#dadce0",
                                        "&.Mui-active": {
                                            color: "#1a73e8",
                                        },
                                        "&.Mui-completed": {
                                            color: "#1a73e8",
                                        },
                                    },
                                }}
                                sx={{
                                    "& .MuiStepLabel-label": {
                                        fontSize: 14,
                                        color: isActive
                                            ? "#1a73e8"
                                            : isCompleted
                                              ? "#3c4043"
                                              : "#5f6368",
                                        fontWeight: isActive ? 600 : 400,
                                        "&.Mui-active": { color: "#1a73e8" },
                                        "&.Mui-completed": { color: "#3c4043" },
                                    },
                                }}
                            >
                                {label}
                            </StepLabel>
                        </Step>
                    );
                })}
            </Stepper>
        </Box>
    );
}
