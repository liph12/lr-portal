import { ReactNode } from "react";
import AppLayout from "../../../components/layouts/AppLayout";
import SalesReportView, { SalesReportViewProps } from "../../../components/reports/SalesReportView";
import { REPORTS } from "../../../components/reports/reportCatalog";

interface ReportShowProps extends Omit<SalesReportViewProps, "title" | "subtitle"> {
    report: string;
}

// One report from the Reports cards: date range, statistics and its ranked table.
function ReportShow({ report, ...props }: ReportShowProps) {
    const card = REPORTS.find((r) => r.slug === report);

    return <SalesReportView {...props} title={card?.title ?? "Report"} subtitle={card?.description ?? ""} fixedView backHref="/reports" />;
}

ReportShow.layout = (page: ReactNode) => <AppLayout children={page} />;

export default ReportShow;
