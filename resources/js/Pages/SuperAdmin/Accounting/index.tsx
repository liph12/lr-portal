import { Typography, Box } from "@mui/material";
import AppLayout from "../../../components/layouts/AppLayout";
import { ReactNode } from "react";
import { Link } from "@inertiajs/react";

interface User {
    name: string;
    email: string;
}

function Accounting({ user }: { user: User }) {
    return (
        <Box p={3}>
            <Typography variant="h5" gutterBottom>
                Accounting
            </Typography>

            <Typography>
                Welcome, {user.name} ({user.email})
            </Typography>

            <Box mt={2}>
            </Box>
        </Box>
    );
}

Accounting.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;

export default Accounting;
