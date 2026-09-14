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
                    color: "#5f6368",
                },
            }}
        >
            {crumbs.map((crumb, idx) => {
                const isLast = idx === crumbs.length - 1;

                return isLast ? (
                    <Typography
                        key={crumb.path}
                        sx={{ fontSize: 13, color: "#202124", fontWeight: 500 }}
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
                                color: "#1a73e8",
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
