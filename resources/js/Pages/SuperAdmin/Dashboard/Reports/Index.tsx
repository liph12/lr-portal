import { Typography, Box } from "@mui/material";
import DashboardLayout from "../../../../components/layouts/DashboardLayout";
import { ReactNode } from "react";
import { Link } from "@inertiajs/react";

function Reports() {
    return (
        <Link href="/superadmin/dashboard/view-sales/developer">
            <Typography>Developer Reports</Typography>
        </Link>
    );
}

Reports.layout = (page: ReactNode) => <DashboardLayout children={page} />;

export default Reports;
