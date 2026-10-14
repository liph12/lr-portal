import { Box, BoxProps } from "@mui/material";
import LOGO_LIGHT from "../../../assets/fire-logo.png";
import LOGO_DARK from "../../../assets/fire-logo-white.png";

// FIRE — Filipinohomes Institute of Real Estate: its lettering is dark on light surfaces and white in dark mode (the shield stays).
export default function FireLogo({ sx, ...props }: BoxProps<"img">) {
    return (
        <>
            <Box {...props} component="img" src={LOGO_LIGHT} alt="FIRE — Filipinohomes Institute of Real Estate" className="lr-light-only" sx={{ height: "auto", display: "block", ...sx }} />
            <Box {...props} component="img" src={LOGO_DARK} alt="FIRE — Filipinohomes Institute of Real Estate" className="lr-dark-only" sx={{ height: "auto", display: "block", ...sx }} />
        </>
    );
}
