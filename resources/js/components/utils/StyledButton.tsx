import { AnchorHTMLAttributes } from "react";
import { Button, ButtonProps } from "@mui/material";

// With `href` MUI renders a link: let it take a link's target / rel too.
type StyledButtonProps = ButtonProps & Pick<AnchorHTMLAttributes<HTMLAnchorElement>, "target" | "rel">;

export default function StyledButton({ children, sx, ...props }: StyledButtonProps) {
    return (
        <Button
            {...props}
            disableElevation
            sx={{
                textTransform: "none",
                borderRadius: 99,
                fontWeight: 500,
                ...sx,
            }}
        >
            {children}
        </Button>
    );
}
