import { ReactNode } from "react";
import AppLayout from "../../../components/layouts/AppLayout";
import SalesReportView, { SalesReportViewProps } from "../../../components/reports/SalesReportView";
import MyTeamNav, { MyTeamGroup } from "../../../components/myteam/MyTeamNav";

interface MyTeamProps extends Omit<SalesReportViewProps, "title" | "subtitle"> {
    group: MyTeamGroup;
    isTeam: boolean;
}

// My Team › Overview: the leader's own team (or sub-team) report — opens on last month's top agents.
function MyTeam({ group, isTeam, filters, ...props }: MyTeamProps) {
    // Keeps ?team= / ?sub_team= on every filter change, so the page stays on this group.
    const scoped = { ...filters, [group.type === "team" ? "team" : "sub_team"]: group.id };

    return (
        <SalesReportView
            {...props}
            filters={scoped}
            title="My Team"
            subtitle={isTeam ? "Your team's sales, members and sub-teams." : "Your sub-team's sales and members."}
            fixedView
            lockScope
            header={<MyTeamNav group={group} isTeam={isTeam} />}
        />
    );
}

MyTeam.layout = (page: ReactNode) => <AppLayout children={page} />;

export default MyTeam;
