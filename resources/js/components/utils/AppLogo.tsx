import { Box, BoxProps } from "@mui/material";
import LOGO_LIGHT from "../../../assets/lr-logo.svg";
import LOGO_DARK from "../../../assets/lr-logo-white.png";

export default function AppLogo({ sx, ...props }: BoxProps<"img">) {
    return (
        <>
            <Box
                {...props}
                component="img"
                src={LOGO_LIGHT}
                alt="Leuterio Realty"
                className="lr-light-only"
                sx={{ height: "auto", display: "block", ...sx }}
            />
            <Box
                {...props}
                component="img"
                src={LOGO_DARK}
                alt="Leuterio Realty"
                className="lr-dark-only"
                sx={{ height: "auto", display: "block", ...sx }}
            />
        </>
    );
}
