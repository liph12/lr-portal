import { Button, ButtonProps } from "@mui/material";

export default function StyledButton({ children, ...props }: ButtonProps) {
    return (
        <Button
            {...props}
            sx={{
                textTransform: "none",
                borderRadius: 0,
                ...(props.sx || {}),
            }}
            disableElevation
        >
            {children}
        </Button>
    );
}
