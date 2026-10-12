import { ReactNode } from "react";
import { Container } from "@mui/material";
import AppLayout from "../../../components/layouts/AppLayout";
import SectionTitle from "../../../components/utils/SectionTitle";
import PreferencesForm from "../../../components/utils/forms/PreferencesForm";
import useAuthUser from "../../../hooks/useAuthUser";

// Settings › Preferences for every user with use_preferences (the route checks it, so `preferences` is set here).
function Preferences() {
    const preferences = useAuthUser()?.preferences;

    return (
        <Container maxWidth="md" sx={{ py: { xs: 3, sm: 4 } }}>
            <SectionTitle title="Preferences" subtitle="How LR Portal looks and behaves for you." />
            {preferences && <PreferencesForm preferences={preferences} />}
        </Container>
    );
}

Preferences.layout = (page: ReactNode) => <AppLayout children={page} />;

export default Preferences;
