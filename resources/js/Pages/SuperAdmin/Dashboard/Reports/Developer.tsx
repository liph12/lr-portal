import { Typography, Box } from "@mui/material";
import DashboardLayout from "../../../../components/layouts/DashboardLayout";
import { ReactNode } from "react";

function Developer() {
    return <Typography>Developer</Typography>;
}

Developer.layout = (page: ReactNode) => <DashboardLayout children={page} />;

export default Developer;
