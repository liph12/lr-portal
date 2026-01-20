import { Typography } from "@mui/material";
import AppLayout from "../../components/layouts/AppLayout";
import { ReactNode } from "react";
import StyledButton from "../../components/utils/StyledButton";
import { router } from "@inertiajs/react";

interface User {
    name: string;
    email: string;
}

function AdminDashboard({ user }: { user: User }) {
    const handleLogout = () => router.post("/logout");

    return (
        <>
            <Typography>{user.name}</Typography>
            <Typography>{user.email}</Typography>
            <StyledButton
                color="error"
                size="small"
                variant="contained"
                onClick={handleLogout}
            >
                Logout
            </StyledButton>
        </>
    );
}

AdminDashboard.layout = (page: ReactNode) => <AppLayout children={page} />;

export default AdminDashboard;
