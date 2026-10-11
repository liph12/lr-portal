import Box from "@mui/material/Box";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepButton from "@mui/material/StepButton";
import StepLabel from "@mui/material/StepLabel";

interface RecordSaleStepperProps {
    activeStep: number;
    steps: Array<string>;
    onStepClick?: (step: number) => void;
    // Steps holding a validation error (from the browser or the server), shown in red.
    errorSteps?: number[];
    disabled?: boolean;
}

export default function RecordSaleStepper({
    activeStep,
    steps,
    onStepClick,
    errorSteps = [],
    disabled = false,
}: RecordSaleStepperProps) {
    const theme = useTheme();
    // Side-by-side labels don't fit three steps on a phone; stack them under the icons.
    const compact = useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true });

    return (
        <Box sx={{ width: "100%", my: 3 }}>
            <Stepper activeStep={activeStep} alternativeLabel={compact} nonLinear>
                {steps.map((label, index) => {
                    const isActive = index === activeStep;
                    const isCompleted = index < activeStep;
                    const hasError = errorSteps.indexOf(index) !== -1;

                    return (
                        <Step key={label} completed={isCompleted}>
                            <StepButton
                                onClick={() => onStepClick?.(index)}
                                disabled={disabled || !onStepClick || isActive}
                                sx={{ borderRadius: 2, py: 1, my: -1 }}
                            >
                                <StepLabel
                                    error={hasError}
                                    StepIconProps={{
                                        sx: {
                                            fontSize: 24,
                                            color: "var(--lr-outline)",
                                            "&.Mui-active": { color: "var(--lr-primary)" },
                                            "&.Mui-completed": { color: "var(--lr-primary)" },
                                            "&.Mui-error": { color: "var(--lr-error)" },
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
                                            "&.Mui-error": { color: "var(--lr-error)" },
                                        },
                                    }}
                                >
                                    {label}
                                </StepLabel>
                            </StepButton>
                        </Step>
                    );
                })}
            </Stepper>
        </Box>
    );
}
