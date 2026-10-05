import Breadcrumbs from "@mui/material/Breadcrumbs";
import Typography from "@mui/material/Typography";
import useBreadcrumbs from "../../hooks/useBreadcrumbs";
import { Link } from "@inertiajs/react";

export default function AppBreadcrumbs() {
    const crumbs = useBreadcrumbs();

    return (
        <Breadcrumbs
            sx={{
                fontSize: 13,
                "& .MuiBreadcrumbs-separator": {
                    color: "var(--lr-text-secondary)",
                },
            }}
        >
            {crumbs.map((crumb, idx) => {
                const isLast = idx === crumbs.length - 1;

                return isLast ? (
                    <Typography
                        key={crumb.path}
                        sx={{ fontSize: 13, color: "var(--lr-text-primary)", fontWeight: 500 }}
                    >
                        {crumb.name}
                    </Typography>
                ) : (
                    <Link
                        key={crumb.path}
                        href={crumb.path}
                        style={{ textDecoration: "none" }}
                    >
                        <Typography
                            sx={{
                                fontSize: 13,
                                color: "var(--lr-primary)",
                                ":hover": { textDecoration: "underline" },
                            }}
                        >
                            {crumb.name}
                        </Typography>
                    </Link>
                );
            })}
        </Breadcrumbs>
    );
}
