import { ReactNode } from "react";
import { Box } from "@mui/material";
import AppSidebar from "../AppSidebar";
import AppNavbar from "../AppNavbar";

export default function AppLayout({ children }: { children: ReactNode }) {
    return (
        <Box>
            <AppNavbar />
            <Box sx={{ display: "flex" }}>
                <AppSidebar />
                <Box sx={{ width: "100%" }}>{children}</Box>
            </Box>
        </Box>
    );
}
