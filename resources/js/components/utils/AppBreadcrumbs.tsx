import Breadcrumbs from "@mui/material/Breadcrumbs";
import Typography from "@mui/material/Typography";
import useBreadcrumbs from "../../hooks/useBreadcrumbs";
import { Link } from "@inertiajs/react";

export default function AppBreadcrumbs() {
    const crumbs = useBreadcrumbs();

    return (
        <Breadcrumbs>
            {crumbs.map((crumb, idx) => {
                const isLast = idx === crumbs.length - 1;

                return isLast ? (
                    <Typography key={crumb.path} color="textPrimary">
                        {crumb.name}
                    </Typography>
                ) : (
                    <Link
                        key={crumb.path}
                        href={crumb.path}
                        style={{
                            textTransform: "none",
                            textDecoration: "none",
                        }}
                    >
                        <Typography color="error">{crumb.name}</Typography>
                    </Link>
                );
            })}
        </Breadcrumbs>
    );
}
