import { ReactNode } from "react";
import { Container } from "@mui/material";
import AppLayout from "../layouts/AppLayout";
import ManagementLayout from "../layouts/ManagementLayout";
import SectionTitle from "../utils/SectionTitle";
import SmsNav from "./SmsNav";
import useAuthUser from "../../hooks/useAuthUser";

// SMS Manager's frame: a Management section for the back office (their menu reaches it there); a page of its own for
// everyone else allowed to send (team leaders, who have no Management).
export default function SmsLayout({ children }: { children: ReactNode }) {
    const user = useAuthUser();

    if (user?.portal) {
        return (
            <ManagementLayout>
                <SmsNav />
                {children}
            </ManagementLayout>
        );
    }

    return (
        <AppLayout>
            <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>
                <SectionTitle
                    title="SMS Manager"
                    subtitle="Text the members of your team by role, or any numbers. Each SMS part to each number uses one credit."
                />
                <SmsNav />
                {children}
            </Container>
        </AppLayout>
    );
}
