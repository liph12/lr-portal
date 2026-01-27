import { ReactNode, useState } from "react";
import CreateSaleStepper from "../utils/CreateSaleStepper";
import { useCreateSaleSteps } from "../../appdata";
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

    const handleChangeStep = <K extends keyof CreateSaleCompletedSteps>(
        opr: string = "+"
    ) => {
        setActiveStep((prevActiveStep) => {
            const nextStep =
                opr === "-" ? prevActiveStep - 1 : prevActiveStep + 1;
            const currentStepKey: K = Object.keys(
                createSaleCompletedSteps
            ).find((v, i) => i === nextStep) as K;

            setStepKey(currentStepKey);

            return nextStep;
        });
    };

    const handleNext = () => handleChangeStep();
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
            <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
                <StyledButton
                    type="submit"
                    size="small"
                    variant="contained"
                    sx={{ borderRadius: 0 }}
                    disableElevation
                    color="inherit"
                    onClick={handlePrev}
                    disabled={activeStep === 0}
                    startIcon={<WestIcon />}
                >
                    Back
                </StyledButton>
                <StyledButton
                    // disabled={!createSaleCompletedSteps[stepKey]}
                    type="submit"
                    size="small"
                    variant="contained"
                    sx={{ borderRadius: 0 }}
                    disableElevation
                    color="error"
                    onClick={handleNext}
                    endIcon={<EastIcon />}
                >
                    Next
                </StyledButton>
            </Box>
        </Box>
    );
}
