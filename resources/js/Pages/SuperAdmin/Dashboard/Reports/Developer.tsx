import { Typography, Box } from "@mui/material";
import AppLayout from "../../../../components/layouts/AppLayout";
import { ReactNode } from "react";

function Developer() {
    return <Typography>Developer</Typography>;
}

Developer.layout = (page: ReactNode) => <AppLayout children={page} />;

export default Developer;
