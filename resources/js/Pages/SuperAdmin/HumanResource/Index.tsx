import { Typography, Box } from "@mui/material";
import AppLayout from "../../../components/layouts/AppLayout";
import { ReactNode } from "react";

interface User {
    name: string;
    email: string;
}

function HumanResource({ user }: { user: User }) {
    return (
        <Box>
            <Typography variant="h5">Human Resource</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
                Welcome, {user.name}!
            </Typography>
        </Box>
    );
}

// Same layout as Accounting & Documentation
HumanResource.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;

export default HumanResource;
