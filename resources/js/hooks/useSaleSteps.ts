import { useState } from "react";

interface SaleSteps {
    activeStep: number;
    setActiveStep: (step: number) => void;
    next: () => void;
    back: () => void;
    jumpTo: (step: number) => void;
    // Checks every step before submit; lands on the first one still missing something.
    validateAll: () => boolean;
}

// Steps never block moving around: leaving a step only flags its missing required fields
// (shown as warnings, and the step turns red) so they can be filled in any order before submit.
export default function useSaleSteps(stepCount: number, validateStep: (step: number) => boolean): SaleSteps {
    const [activeStep, setActiveStep] = useState(0);

    const jumpTo = (target: number) => {
        validateStep(activeStep);
        setActiveStep(Math.min(Math.max(target, 0), stepCount - 1));
    };

    const validateAll = () => {
        let firstInvalid = -1;
        for (let s = 0; s < stepCount; s++) {
            if (!validateStep(s) && firstInvalid === -1) firstInvalid = s;
        }
        if (firstInvalid !== -1) setActiveStep(firstInvalid);

        return firstInvalid === -1;
    };

    return {
        activeStep,
        setActiveStep,
        next: () => jumpTo(activeStep + 1),
        back: () => jumpTo(activeStep - 1),
        jumpTo,
        validateAll,
    };
}
