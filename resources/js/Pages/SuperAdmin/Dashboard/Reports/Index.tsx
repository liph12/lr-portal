import { Typography, Box } from "@mui/material";
import AppLayout from "../../../../components/layouts/AppLayout";
import { ReactNode } from "react";
import { Link } from "@inertiajs/react";

function Reports() {
    return (
        <Link href="/superadmin/dashboard/view-reports/developer">
            <Typography>Developer Reports</Typography>
        </Link>
    );
}

Reports.layout = (page: ReactNode) => <AppLayout children={page} />;

export default Reports;
