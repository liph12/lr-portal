import { ReactNode } from "react";
import DashboardLayout from "../../../../components/layouts/DashboardLayout";
import AgentSalesView, { AgentSalesProps } from "../../../../components/sales/AgentSalesView";

// My Sales: the signed-in agent's own sales one by one, then their statistics.
function MySales(props: AgentSalesProps) {
    return <AgentSalesView {...props} basePath="/dashboard/my-sales" title="My Sales" subtitle="Your own sales, client by client. Click a sale for its details and files." />;
}

MySales.layout = (page: ReactNode) => <DashboardLayout children={page} />;

export default MySales;
