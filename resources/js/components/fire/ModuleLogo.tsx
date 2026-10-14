import { Box, SxProps } from "@mui/material";
import FireLogo from "./FireLogo";
import RENTPH_LIGHT from "../../../assets/rentph-logo-tagline.png";
import RENTPH_DARK from "../../../assets/onboarding/rentph-logo-white.png";
import { FireModule } from "../../types/app-data-types";

// The brand a FIRE module is taught under: Rent.ph's "Become a Rent Manager" carries Rent.ph's logo, the rest FIRE's.
export default function ModuleLogo({ module, width, sx }: { module?: Pick<FireModule, "brand">; width: number; sx?: SxProps }) {
    if (module?.brand !== "rentph") return <FireLogo sx={{ width, ...sx }} />;
    return (
        <Box sx={sx}>
            <Box component="img" src={RENTPH_LIGHT} alt="Rent.ph" className="lr-light-only" sx={{ width: width * 0.62, height: "auto", display: "block" }} />
            <Box component="img" src={RENTPH_DARK} alt="Rent.ph" className="lr-dark-only" sx={{ width: width * 0.62, height: "auto", display: "block" }} />
        </Box>
    );
}
