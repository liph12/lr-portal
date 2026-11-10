import { Typography } from "@mui/material";
import CategoryColumnChart from "../charts/CategoryColumnChart";
import { formatCount, formatPesoCompact } from "../../helpers/formatNumber";
import { ClientAges } from "../../types/app-data-types";

interface ClientAgeChartProps {
    ages: ClientAges;
    // The client (the buyer) by default, or the selling agent.
    subject?: "client" | "seller";
}

// Sales by an age band — the client's by default, or the selling agent's — with a note on how many sales it's based on.
export default function ClientAgeChart({ ages, subject = "client" }: ClientAgeChartProps) {
    const who = subject === "seller" ? "selling agent's" : "client's";

    return (
        <>
            <CategoryColumnChart
                items={ages.counted ? ages.rows.map((r) => ({ name: r.name, value: r.sales, detail: formatPesoCompact(r.value) })) : []}
                caption={`Sales by the ${who} age`}
                formatValue={(n) => `${formatCount(n)} ${n === 1 ? "sale" : "sales"}`}
                emptyText={`No sales with a ${who} age in this range.`}
            />
            {ages.excluded > 0 && (
                <Typography variant="caption" component="p" sx={{ color: "var(--lr-text-secondary)", mt: 1.5 }}>
                    Based on {formatCount(ages.counted)} {ages.counted === 1 ? "sale" : "sales"} with a {who} age of 18–99;{" "}
                    {formatCount(ages.excluded)} without one {ages.excluded === 1 ? "isn't" : "aren't"} counted.
                </Typography>
            )}
        </>
    );
}
