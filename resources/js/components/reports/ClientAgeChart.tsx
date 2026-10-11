import { Typography } from "@mui/material";
import BarList from "../charts/BarList";
import { formatCount, formatPesoCompact } from "../../helpers/formatNumber";
import { ClientAges } from "../../types/app-data-types";

// Sales by the client's age band, with a note on how many sales the split is based on.
export default function ClientAgeChart({ ages }: { ages: ClientAges }) {
    return (
        <>
            <BarList
                items={ages.counted ? ages.rows.map((r) => ({ name: r.name, value: r.sales, detail: formatPesoCompact(r.value) })) : []}
                caption="Sales by the client's age"
                formatValue={(n) => `${formatCount(n)} ${n === 1 ? "sale" : "sales"}`}
                emptyText="No sales with a client age in this range."
            />
            {ages.excluded > 0 && (
                <Typography variant="caption" component="p" sx={{ color: "var(--lr-text-secondary)", mt: 1.5 }}>
                    Based on {formatCount(ages.counted)} {ages.counted === 1 ? "sale" : "sales"} with a client age of 18–99;{" "}
                    {formatCount(ages.excluded)} without one {ages.excluded === 1 ? "isn't" : "aren't"} counted.
                </Typography>
            )}
        </>
    );
}
