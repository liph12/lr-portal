import { Button, ButtonProps } from "@mui/material";

export default function StyledButton({ children, sx, ...props }: ButtonProps) {
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
