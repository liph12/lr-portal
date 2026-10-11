import { ReactNode } from "react";
import { Container } from "@mui/material";
import AppLayout from "../../../components/layouts/AppLayout";
import SectionTitle from "../../../components/utils/SectionTitle";
import RecruitmentView, { RecruitmentViewProps } from "../../../components/recruitment/RecruitmentView";
import MyTeamNav, { MyTeamGroup } from "../../../components/myteam/MyTeamNav";

interface RecruitsProps extends RecruitmentViewProps {
    group: MyTeamGroup;
    canManage: boolean;
}

// My Team › Recruits: the dashboard Overview for this team or sub-team.
function Recruits({ group, canManage, ...props }: RecruitsProps) {
    return (
        <Container maxWidth="xl" sx={{ py: { xs: 3, sm: 4 } }}>
            <SectionTitle title={`My Team · ${group.name}`} subtitle="Members, recruits and how new sign-ups are doing with NAO and FIRE." />
            <RecruitmentView {...props} keep={{ [group.type === "team" ? "team" : "sub_team"]: group.id }} header={<MyTeamNav group={group} canManage={canManage} />} />
        </Container>
    );
}

Recruits.layout = (page: ReactNode) => <AppLayout children={page} />;

export default Recruits;
