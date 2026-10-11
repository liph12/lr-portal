import { ReactNode } from "react";
import DashboardLayout from "../../../../components/layouts/DashboardLayout";
import SalesReportView, { SalesReportViewProps } from "../../../../components/reports/SalesReportView";

type ViewSalesProps = Omit<SalesReportViewProps, "title" | "subtitle">;

// Dashboard › View Sales: every view in one place, switched with tabs.
function ViewSales(props: ViewSalesProps) {
    return <SalesReportView {...props} title="Sales report" subtitle="Valid sales by reservation date unless you change the status filter." />;
}

ViewSales.layout = (page: ReactNode) => <DashboardLayout children={page} />;

export default ViewSales;
