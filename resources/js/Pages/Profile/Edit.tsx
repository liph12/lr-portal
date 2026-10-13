import { ReactNode } from "react";
import { Box, Container, Grid } from "@mui/material";
import AppLayout from "../../components/layouts/AppLayout";
import SectionTitle from "../../components/utils/SectionTitle";
import SectionCard from "../../components/cards/SectionCard";
import ReferralLinkCard from "../../components/registration/ReferralLinkCard";
import ProfilePhotoCard from "../../components/cards/ProfilePhotoCard";
import ProfileDetailsForm from "../../components/utils/forms/ProfileDetailsForm";
import ChangePasswordForm from "../../components/utils/forms/ChangePasswordForm";
import useAuthUser from "../../hooks/useAuthUser";
import { ProfileFields } from "../../types/app-data-types";

interface EditProfileProps {
    profile: ProfileFields;
    maritalStatuses: string[];
    // Their link for inviting new agents (null without an agent record).
    referralLink: string | null;
    maxPhotoKb: number;
}

function Edit({ profile, maritalStatuses, maxPhotoKb, referralLink }: EditProfileProps) {
    const user = useAuthUser();

    return (
        <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4 } }}>
            <SectionTitle title="Edit profile" subtitle="Your photo and details as shown across LR Portal." />

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Box sx={{ position: { md: "sticky" }, top: { md: 24 } }}>
                        <ProfilePhotoCard
                            name={user?.name ?? ""}
                            email={user?.email ?? ""}
                            role={user?.role ?? null}
                            avatar={user?.avatar ?? null}
                            maxPhotoKb={maxPhotoKb}
                        />
                        {referralLink && <ReferralLinkCard link={referralLink} />}
                    </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 8 }} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <SectionCard title="Agent details" subtitle="Saving also updates your account name and sign-in email.">
                        <ProfileDetailsForm profile={profile} maritalStatuses={maritalStatuses} />
                    </SectionCard>
                    <SectionCard title="Change password">
                        <ChangePasswordForm />
                    </SectionCard>
                </Grid>
            </Grid>
        </Container>
    );
}

Edit.layout = (page: ReactNode) => <AppLayout children={page} />;

export default Edit;
