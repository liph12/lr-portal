import { ReactNode } from "react";
import { Box } from "@mui/material";
import AppSidebar from "../AppSidebar";
import AppNavbar from "../AppNavbar";

export default function AppLayout({ children }: { children: ReactNode }) {
    return (
        <Box
            sx={{
                height: "100vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
            }}
        >
            <AppNavbar />
            <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
                <AppSidebar />
                <Box
                    component="main"
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        overflowY: "auto",
                        overflowX: "hidden",
                        scrollBehavior: "smooth",
                    }}
                >
                    {children}
                </Box>
            </Box>
        </Box>
    );
}
