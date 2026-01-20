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
                {steps.map((label, index) => (
                    <Step key={label}>
                        <StepLabel
                            StepIconProps={{
                                sx: {
                                    fontSize: 22,
                                    color:
                                        index === activeStep
                                            ? "error.main"
                                            : "#bbb",
                                    "&.Mui-active": {
                                        color: "error.main",
                                    },
                                    "&.Mui-completed": {
                                        color: "success.main",
                                    },
                                },
                            }}
                            sx={{
                                "& .MuiStepLabel-label": {
                                    color:
                                        index === activeStep
                                            ? "error.main"
                                            : "#bbb",
                                    fontWeight:
                                        index === activeStep
                                            ? "bold"
                                            : "normal",
                                    fontSize: 15,
                                },
                            }}
                        >
                            {label}
                        </StepLabel>
                    </Step>
                ))}
            </Stepper>
        </Box>
    );
}
