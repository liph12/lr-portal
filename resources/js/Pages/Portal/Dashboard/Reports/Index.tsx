import { ReactNode } from "react";
import DashboardLayout from "../../../../components/layouts/DashboardLayout";
import SalesReportView, { SalesReportViewProps } from "../../../../components/reports/SalesReportView";

interface ViewSalesProps extends Omit<SalesReportViewProps, "title" | "subtitle"> {
    // True outside the back office: leaders see their own team, other field roles their own sales.
    scopeLocked: boolean;
}

// Dashboard › View Sales: every view in one place, switched with tabs.
function ViewSales({ scopeLocked, ...props }: ViewSalesProps) {
    return (
        <SalesReportView
            {...props}
            lockScope={scopeLocked}
            title="Sales report"
            subtitle={scopeLocked ? "Valid sales within your reach, by reservation date." : "Valid sales by reservation date unless you change the status filter."}
        />
    );
}

ViewSales.layout = (page: ReactNode) => <DashboardLayout children={page} />;

export default ViewSales;
