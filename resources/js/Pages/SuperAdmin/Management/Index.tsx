import { Typography, Box } from "@mui/material";
import AppLayout from "../../../components/layouts/AppLayout";
import { ReactNode } from "react";
import { Link, router } from "@inertiajs/react";

interface User {
    name: string;
    email: string;
}

function Management({ user }: { user: User }) {
    return (
        <>
            <Box>
                <Typography>Management</Typography>
            </Box>
        </>
    );
}

Management.layout = (page: ReactNode) => <AppLayout children={page} />;

export default Management;
