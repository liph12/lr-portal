import { ReactNode } from "react";
import AppLayout from "../../../components/layouts/AppLayout";
import SalesReportView, { SalesReportViewProps } from "../../../components/reports/SalesReportView";
import { REPORTS } from "../../../components/reports/reportCatalog";

interface ReportShowProps extends Omit<SalesReportViewProps, "title" | "subtitle"> {
    report: string;
    // Leaders see their own team, other field roles their own sales (set by the server).
    scopeLocked: boolean;
}

// One report from the Reports cards: date range, statistics and its ranked table.
function ReportShow({ report, scopeLocked, ...props }: ReportShowProps) {
    const card = REPORTS.find((r) => r.slug === report);

    return <SalesReportView {...props} title={card?.title ?? "Report"} subtitle={card?.description ?? ""} fixedView lockScope={scopeLocked} backHref="/reports" />;
}

ReportShow.layout = (page: ReactNode) => <AppLayout children={page} />;

export default ReportShow;
