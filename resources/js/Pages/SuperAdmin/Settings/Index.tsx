import { Typography, Box } from "@mui/material";
import AppLayout from "../../../components/layouts/AppLayout";
import { ReactNode } from "react";
import { Link, router } from "@inertiajs/react";

interface User {
    name: string;
    email: string;
}

function Settings({ user }: { user: User }) {
    return (
        <>
            <Box>
                <Typography variant="h5">Settings</Typography>
                <Typography>Settings</Typography>
            </Box>
        </>
    );
}

Settings.layout = (page: ReactNode) => <AppLayout children={page} />;

export default Settings;
