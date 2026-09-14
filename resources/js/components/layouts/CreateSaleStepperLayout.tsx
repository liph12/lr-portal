import { ReactNode, useState } from "react";
import CreateSaleStepper from "../utils/CreateSaleStepper";
import { useCreateSaleSteps } from "../../app-data";
import { CreateSaleCompletedSteps } from "../../types";
import { useAppProvider } from "../../providers/AppProvider";
import { Box } from "@mui/material";
import EastIcon from "@mui/icons-material/East";
import WestIcon from "@mui/icons-material/West";
import StyledButton from "../utils/StyledButton";
import CreateProjectSaleStepperContent from "../utils/CreateProjectSaleStepperContent";
import { SalesSource } from "../../types/app-data-types";

export default function CreateSaleStepperLayout({
    salesSources,
}: {
    salesSources: SalesSource[];
}) {
    const { createSaleCompletedSteps } = useAppProvider();
    const [activeStep, setActiveStep] = useState<number>(0);
    const [stepKey, setStepKey] =
        useState<keyof CreateSaleCompletedSteps>("clientDetails");

    const isLastStep = activeStep === useCreateSaleSteps.length - 1;

    const handleChangeStep = (opr: "+" | "-" = "+") => {
        setActiveStep((prevActiveStep) => {
            const nextStep =
                opr === "-" ? prevActiveStep - 1 : prevActiveStep + 1;

            const currentStepKey = Object.keys(createSaleCompletedSteps)[
                nextStep
            ] as keyof CreateSaleCompletedSteps;

            if (currentStepKey) setStepKey(currentStepKey);

            return nextStep;
        });
    };

    const handleNext = () => handleChangeStep("+");
    const handlePrev = () => handleChangeStep("-");

    return (
        <Box>
            <CreateSaleStepper
                activeStep={activeStep}
                steps={useCreateSaleSteps}
            />
            <Box sx={{ height: "45vh", py: 3 }}>
                <CreateProjectSaleStepperContent
                    step={activeStep}
                    salesSources={salesSources}
                />
            </Box>
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 1.5,
                    mt: 5,
                }}
            >
                <StyledButton
                    size="medium"
                    variant="text"
                    onClick={handlePrev}
                    disabled={activeStep === 0}
                    startIcon={<WestIcon />}
                    sx={{
                        px: 2.5,
                        color: "#1a73e8",
                        ":hover": { backgroundColor: "#f1f3f4" },
                    }}
                >
                    Back
                </StyledButton>
                <StyledButton
                    // disabled={!createSaleCompletedSteps[stepKey]}
                    size="medium"
                    variant="contained"
                    onClick={handleNext}
                    endIcon={!isLastStep && <EastIcon />}
                    sx={{
                        px: 3,
                        backgroundColor: "#1a73e8",
                        ":hover": { backgroundColor: "#1765cc" },
                    }}
                >
                    {isLastStep ? "Submit" : "Next"}
                </StyledButton>
            </Box>
        </Box>
    );
}
