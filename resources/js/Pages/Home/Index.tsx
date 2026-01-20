import { Typography } from "@mui/material";
import AppLayout from "../../components/layouts/AppLayout";
import { ReactNode } from "react";

function Home() {
    return (
        <>
            <Typography>Home</Typography>
        </>
    );
}

Home.layout = (page: ReactNode) => <AppLayout children={page} />;

export default Home;
