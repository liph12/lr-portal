import { ReactNode } from "react";
import { Box, LinearProgress, Typography } from "@mui/material";
import EastIcon from "@mui/icons-material/East";
import WestIcon from "@mui/icons-material/West";
import CloudUploadRounded from "@mui/icons-material/CloudUploadRounded";
import RecordSaleStepper from "../utils/RecordSaleStepper";
import StyledButton from "../utils/StyledButton";

interface RecordSaleStepperLayoutProps {
    steps: string[];
    activeStep: number;
    onBack: () => void;
    onNext: () => void;
    onSubmit: () => void;
    processing: boolean;
    // Holds the primary button while something on the step (e.g. photo compression) is still running.
    busy?: boolean;
    uploadPercentage?: number;
    children: ReactNode;
}

export default function RecordSaleStepperLayout({
    steps,
    activeStep,
    onBack,
    onNext,
    onSubmit,
    processing,
    busy = false,
    uploadPercentage,
    children,
}: RecordSaleStepperLayoutProps) {
    const isLastStep = activeStep === steps.length - 1;

    return (
        <Box>
            <RecordSaleStepper activeStep={activeStep} steps={steps} />
            <Box sx={{ minHeight: "45vh", py: 3 }}>{children}</Box>

            {processing && (
                <Box sx={{ mt: 2 }}>
                    <LinearProgress
                        variant={uploadPercentage !== undefined ? "determinate" : "indeterminate"}
                        value={uploadPercentage}
                        sx={{ borderRadius: 99, height: 6 }}
                    />
                    <Typography
                        variant="caption"
                        sx={{ color: "var(--lr-text-secondary)", display: "block", mt: 0.5, textAlign: "center" }}
                    >
                        {uploadPercentage !== undefined && uploadPercentage < 100
                            ? `Uploading… ${uploadPercentage}%`
                            : "Compressing and saving your files…"}
                    </Typography>
                </Box>
            )}

            <Box
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 1.5,
                    mt: { xs: 2, sm: 5 },
                }}
            >
                <StyledButton
                    size="medium"
                    variant="text"
                    onClick={onBack}
                    disabled={activeStep === 0 || processing}
                    startIcon={<WestIcon />}
                    sx={{
                        px: 2.5,
                        color: "var(--lr-primary)",
                        ":hover": { backgroundColor: "var(--lr-surface-container)" },
                    }}
                >
                    Back
                </StyledButton>
                <StyledButton
                    size="medium"
                    variant="contained"
                    onClick={isLastStep ? onSubmit : onNext}
                    loading={processing}
                    disabled={busy}
                    endIcon={isLastStep ? <CloudUploadRounded /> : <EastIcon />}
                    sx={{
                        px: 3,
                        backgroundColor: "var(--lr-primary)",
                        ":hover": { backgroundColor: "var(--lr-primary-hover)" },
                    }}
                >
                    {isLastStep ? "Submit Sale" : "Next"}
                </StyledButton>
            </Box>
        </Box>
    );
}
