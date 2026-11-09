import { ReactNode } from "react";
import { Container } from "@mui/material";
import AppLayout from "../layouts/AppLayout";
import ManagementLayout from "../layouts/ManagementLayout";
import SectionTitle from "../utils/SectionTitle";
import useAuthUser from "../../hooks/useAuthUser";

// Reactivation Requests' frame: a Management section for the back office (their menu reaches it there); a page of its
// own for everyone else who reviews within their reach (team leaders, unit managers, sponsors — who have no Management).
export default function ReactivationRequestsLayout({ children }: { children: ReactNode }) {
    const user = useAuthUser();

    if (user?.portal) {
        return <ManagementLayout>{children}</ManagementLayout>;
    }

    return (
        <AppLayout>
            <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>
                <SectionTitle
                    title="Reactivation Requests"
                    subtitle="Agents FIRE activated who then had no sale in time. Check each file, then approve or disapprove."
                />
                {children}
            </Container>
        </AppLayout>
    );
}
