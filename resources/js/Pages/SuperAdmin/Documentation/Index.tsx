import { Typography, Box } from "@mui/material";
import AppLayout from "../../../components/layouts/AppLayout";
import { ReactNode } from "react";

interface User {
    name: string;
    email: string;
}

function Documentation({ user }: { user: User }) {
    return (
        <Box>
            <Typography variant="h5">Documentation</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
                Welcome, {user.name}!
            </Typography>
        </Box>
    );
}

// same layout flow as Accounting
Documentation.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;

export default Documentation;
