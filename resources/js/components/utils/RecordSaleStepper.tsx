import Box from "@mui/material/Box";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";

interface RecordSaleStepperProps {
    activeStep: number;
    steps: Array<string>;
}

export default function RecordSaleStepper({
    activeStep,
    steps,
}: RecordSaleStepperProps) {
    const theme = useTheme();
    // Side-by-side labels don't fit three steps on a phone; stack them under the icons.
    const compact = useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true });

    return (
        <Box sx={{ width: "100%", my: 3 }}>
            <Stepper activeStep={activeStep} alternativeLabel={compact}>
                {steps.map((label, index) => {
                    const isActive = index === activeStep;
                    const isCompleted = index < activeStep;

                    return (
                        <Step key={label}>
                            <StepLabel
                                StepIconProps={{
                                    sx: {
                                        fontSize: 24,
                                        color: "var(--lr-outline)",
                                        "&.Mui-active": {
                                            color: "var(--lr-primary)",
                                        },
                                        "&.Mui-completed": {
                                            color: "var(--lr-primary)",
                                        },
                                    },
                                }}
                                sx={{
                                    "& .MuiStepLabel-label": {
                                        fontSize: { xs: 12, sm: 14 },
                                        color: isActive
                                            ? "var(--lr-primary)"
                                            : isCompleted
                                              ? "var(--lr-text-body)"
                                              : "var(--lr-text-secondary)",
                                        fontWeight: isActive ? 600 : 400,
                                        "&.Mui-active": { color: "var(--lr-primary)" },
                                        "&.Mui-completed": { color: "var(--lr-text-body)" },
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
