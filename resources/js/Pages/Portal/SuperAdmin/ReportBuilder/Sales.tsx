import { ReactNode } from "react";
import { Box } from "@mui/material";
import { DownloadRounded } from "@mui/icons-material";
import ReportBuilderLayout from "../../../../components/reports/ReportBuilderLayout";
import AskAiReportBar from "../../../../components/reports/AskAiReportBar";
import SalesReportView, { ReportFilters, ReportRow, ReportScope } from "../../../../components/reports/SalesReportView";
import { ReportSummary } from "../../../../components/reports/ReportStatistics";
import StyledButton from "../../../../components/utils/StyledButton";
import { ServerPage } from "../../../../hooks/useServerTable";

interface ReportBuilderSalesProps {
    filters: ReportFilters;
    scope: ReportScope[];
    summary: ReportSummary;
    breakdown: ServerPage<ReportRow>;
    options: { categories: string[]; statuses: string[]; views: string[] };
    aiEnabled: boolean;
    groupTabs: boolean;
}

// Every sales view (agents, teams, sub-teams, branches, developers, brokerage, rental, unit managers, team leaders),
// unrestricted (a superadmin's reach is the whole system) and exportable — the same engine as Dashboard › View Sales.
function ReportBuilderSales({ filters, scope, summary, breakdown, options, aiEnabled, groupTabs }: ReportBuilderSalesProps) {
    const query = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => [k, String(v)])));

    return (
        <>
            <AskAiReportBar enabled={aiEnabled} />
            <SalesReportView
                filters={filters}
                scope={scope}
                summary={summary}
                breakdown={breakdown}
                options={options}
                groupTabs={groupTabs}
                title="Sales"
                subtitle="Group by agent, team, branch, developer or role, with any date range, status and category."
                header={
                    <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                        <a href={`/superadmin/report-builder/sales/export?${query.toString()}`} style={{ textDecoration: "none" }}>
                            <StyledButton variant="outlined" size="small" startIcon={<DownloadRounded />} sx={{ color: "var(--lr-primary)", borderColor: "var(--lr-outline)" }}>
                                Export CSV
                            </StyledButton>
                        </a>
                    </Box>
                }
            />
        </>
    );
}

ReportBuilderSales.layout = (page: ReactNode) => <ReportBuilderLayout children={page} />;

export default ReportBuilderSales;
