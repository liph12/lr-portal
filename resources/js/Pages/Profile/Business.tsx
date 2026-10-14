import { ReactNode } from "react";
import { Container, Grid } from "@mui/material";
import { OpenInNewRounded } from "@mui/icons-material";
import AppLayout from "../../components/layouts/AppLayout";
import SectionTitle from "../../components/utils/SectionTitle";
import SectionCard from "../../components/cards/SectionCard";
import StyledButton from "../../components/utils/StyledButton";
import BusinessProfileForm from "../../components/utils/forms/BusinessProfileForm";
import { BusinessProfileFields } from "../../types/app-data-types";

interface BusinessProps {
    business: BusinessProfileFields;
    // The public page's slug; null until the account has an agent record (saving creates one).
    slug: string | null;
}

function Business({ business, slug }: BusinessProps) {
    return (
        <Container maxWidth="md" sx={{ py: { xs: 3, sm: 4 } }}>
            <SectionTitle title="Business profile" subtitle="What clients see on your public business profile and contact page." />

            <Grid container spacing={3}>
                <Grid size={12}>
                    <SectionCard title="Business profile details" subtitle="Your About me, mobile number, social links and My Links.">
                        <BusinessProfileForm business={business} />
                    </SectionCard>
                </Grid>
                {slug && (
                    <Grid size={12} sx={{ display: "flex", justifyContent: "flex-end" }}>
                        <StyledButton
                            component="a"
                            href={`/business-profile/${slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            endIcon={<OpenInNewRounded />}
                            sx={{ px: 2, color: "var(--lr-primary)" }}
                        >
                            View my business profile
                        </StyledButton>
                    </Grid>
                )}
            </Grid>
        </Container>
    );
}

Business.layout = (page: ReactNode) => <AppLayout children={page} />;

export default Business;
