import { ReactNode } from "react";
import { Container } from "@mui/material";
import { ArrowBackRounded } from "@mui/icons-material";
import { Link, router } from "@inertiajs/react";
import ReportScopeHeader, { ReportScopeDetails } from "../../../components/reports/ReportScopeHeader";
import AppLayout from "../../../components/layouts/AppLayout";
import SectionTitle from "../../../components/utils/SectionTitle";
import StyledButton from "../../../components/utils/StyledButton";
import RecruitmentView, { RecruitmentViewProps } from "../../../components/recruitment/RecruitmentView";

interface RecruitsPageProps extends RecruitmentViewProps {
    // Opened from Recruits Progress for one team / sub-team / sponsor.
    selection: (Omit<ReportScopeDetails, "type"> & { type: "team" | "sub_team" | "area" | "sponsor" | "agent" }) | null;
}

// Reports › Recruits: members, recruits and new sign-ups' NAO / FIRE progress (scoped to the reader's reach).
function Recruits({ selection, ...props }: RecruitsPageProps) {
    return (
        <Container maxWidth="xl" sx={{ py: { xs: 3, sm: 4 } }}>
            <Link href="/reports" style={{ textDecoration: "none" }}>
                <StyledButton size="small" variant="text" startIcon={<ArrowBackRounded />} sx={{ mb: 1, px: 1, color: "var(--lr-primary)" }}>
                    All reports
                </StyledButton>
            </Link>
            <SectionTitle title="Recruits" subtitle="Members, recruits and how new sign-ups are doing with NAO and FIRE." />
            {selection && (
                <ReportScopeHeader
                    scope={{ ...selection, type: selection.type === "sponsor" ? "agent" : selection.type }}
                    typeLabel={selection.type === "sponsor" ? "Sponsor / upline" : undefined}
                    total={0}
                    hideTotal
                    onClear={() => router.get("/reports/recruits", { from: props.filters.from, to: props.filters.to })}
                />
            )}
            <RecruitmentView {...props} scope={selection ? null : props.scope} />
        </Container>
    );
}

Recruits.layout = (page: ReactNode) => <AppLayout children={page} />;

export default Recruits;
