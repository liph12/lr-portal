import { Typography } from "@mui/material";
import AppLayout from "../../components/layouts/AppLayout";
import { ReactNode } from "react";

interface User {
    name: string;
    email: string;
}

function User({ user }: { user: User }) {
    return (
        <>
            <Typography>{user.name}</Typography>
            <Typography>{user.email}</Typography>
        </>
    );
}

User.layout = (page: ReactNode) => <AppLayout children={page} />;

export default User;
