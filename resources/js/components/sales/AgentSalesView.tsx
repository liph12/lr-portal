import { ReactNode, useState } from "react";
import { Box, Container, LinearProgress, MenuItem, TextField } from "@mui/material";
import { router } from "@inertiajs/react";
import SectionTitle from "../utils/SectionTitle";
import DateRangeField from "../utils/DateRangeField";
import ReportStatistics, { CATEGORY_LABELS, ReportSummary } from "../reports/ReportStatistics";
import ReportSaleList, { ReportSaleRow } from "../reports/ReportSaleList";
import { SaleDetail } from "./SaleDetailsForm";
import SalesTotals, { CategoryTotal } from "./SalesTotals";
import { ServerPage, TableFilters } from "../../hooks/useServerTable";
import { reportPresets } from "../../helpers/dateRanges";

export interface AgentSalesProps {
    filters: TableFilters & { from: string; to: string; category: string | null; status: string };
    summary: ReportSummary;
    totals: CategoryTotal[];
    saleList: ServerPage<ReportSaleRow>;
    saleDetail: SaleDetail | null;
    options: { categories: string[]; statuses: string[] };
}

interface AgentSalesViewProps extends AgentSalesProps {
    // The page's own path, which the filters reload.
    basePath: string;
    title: string;
    subtitle: string;
    // Above the title (e.g. a back link), and between the title and the filters (e.g. the agent's header).
    top?: ReactNode;
    header?: ReactNode;
    // Dates and status set by the page (My NATCON Sales): no pickers for them, only the category.
    fixedPeriod?: boolean;
}

const selectSx = {
    minWidth: 150,
    "& .MuiOutlinedInput-root": { borderRadius: 99, backgroundColor: "var(--lr-surface-container)", fontSize: 14 },
    "& fieldset": { border: "none" },
};

// One agent's sales one by one (click one for its details and files), then their statistics — My Sales and an agent's
// sales page (/agents/{agent}/sales) are the same view.
export default function AgentSalesView({ filters, summary, totals, saleList, saleDetail, options, basePath, title, subtitle, top, header, fixedPeriod = false }: AgentSalesViewProps) {
    const [loading, setLoading] = useState(false);

    // Dates, category and status narrow both the list and the statistics; back to page 1.
    const change = (next: Record<string, string>) =>
        router.get(
            basePath,
            Object.fromEntries(Object.entries({ from: filters.from, to: filters.to, category: filters.category ?? "", status: filters.status, q: filters.q ?? "", ...next }).filter(([, v]) => v !== "" && v !== null)),
            { only: ["saleList", "summary", "totals", "filters"], preserveState: true, preserveScroll: true, replace: true, onStart: () => setLoading(true), onFinish: () => setLoading(false) },
        );

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>
            {top}
            <SectionTitle title={title} subtitle={subtitle} />
            {header}

            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, mb: 3 }}>
                {!fixedPeriod && <DateRangeField value={{ from: filters.from, to: filters.to }} presets={reportPresets()} onChange={(range) => change({ ...range })} />}
                <TextField select size="small" label="Category" value={filters.category ?? ""} onChange={(e) => change({ category: e.target.value })} slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }} sx={selectSx}>
                    <MenuItem value="">All categories</MenuItem>
                    {options.categories.map((c) => (
                        <MenuItem key={c} value={c}>
                            {CATEGORY_LABELS[c] ?? c}
                        </MenuItem>
                    ))}
                </TextField>
                {!fixedPeriod && (
                    <TextField select size="small" label="Status" value={filters.status} onChange={(e) => change({ status: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} sx={selectSx}>
                        <MenuItem value="all">All statuses</MenuItem>
                        {options.statuses.map((s) => (
                            <MenuItem key={s} value={s} sx={{ textTransform: "capitalize" }}>
                                {s}
                            </MenuItem>
                        ))}
                    </TextField>
                )}
            </Box>
            {loading && <LinearProgress sx={{ height: 2, mb: 2 }} />}

            <SalesTotals totals={totals} category={filters.category} onPick={(category) => change({ category })} />

            <ReportSaleList sales={saleList} filters={filters} detail={saleDetail} showAgent={false} showCategory />

            <Box sx={{ mt: 5 }}>
                <ReportStatistics summary={summary} showCategories={!filters.category} showAreas={false} showAgentsTile={false} />
            </Box>
        </Container>
    );
}
