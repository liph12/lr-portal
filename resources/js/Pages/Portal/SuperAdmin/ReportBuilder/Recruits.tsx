import { ReactNode } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { DownloadRounded } from "@mui/icons-material";
import { GridColDef } from "@mui/x-data-grid";
import ReportBuilderLayout from "../../../../components/reports/ReportBuilderLayout";
import DataTable from "../../../../components/utils/tables/DataTable";
import TableToolbar from "../../../../components/utils/tables/TableToolbar";
import PersonCell from "../../../../components/utils/tables/PersonCell";
import StyledButton from "../../../../components/utils/StyledButton";
import DateRangeField from "../../../../components/utils/DateRangeField";
import useServerTable, { ServerPage, TableFilters } from "../../../../hooks/useServerTable";
import { reportPresets } from "../../../../helpers/dateRanges";
import { formatCount, formatPeso } from "../../../../helpers/formatNumber";

type Group = "teams" | "sub_teams" | "areas" | "sponsors";

interface RecruitGroupRow {
    id: number | string;
    name: string;
    detail: string | null;
    avatar: string | null;
    team: string | null;
    recruits: number;
    sold: number;
    conversion: number;
    value: number;
    trainees: number;
    nao: number;
    fire: number;
    total_sales: number | null;
}

interface ReportBuilderRecruitsProps {
    filters: TableFilters & { from: string; to: string; group: Group };
    table: ServerPage<RecruitGroupRow>;
    options: { groups: Group[] };
}

const GROUP_LABELS: Record<Group, { name: string; column: string; search: string }> = {
    teams: { name: "Teams", column: "Team", search: "Search teams" },
    sub_teams: { name: "Sub-teams", column: "Sub-team", search: "Search sub-teams" },
    areas: { name: "Branches", column: "Branch", search: "Search branches" },
    sponsors: { name: "Sponsors", column: "Sponsor", search: "Search sponsors" },
};

// Recruits signed up in a range, grouped by team, sub-team, branch or sponsor: how many, how many sold, NAO / FIRE
// progress of those still training, and the group's whole sales total — the same engine as Reports › Recruits Progress.
function ReportBuilderRecruits({ filters, table: data, options }: ReportBuilderRecruitsProps) {
    const table = useServerTable("table", data, filters, []);
    const label = GROUP_LABELS[filters.group];
    const query = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => [k, String(v)])));

    const columns: GridColDef<RecruitGroupRow>[] = [
        {
            field: "name",
            headerName: label.column,
            flex: 1.3,
            minWidth: 220,
            renderCell: ({ row }) => <PersonCell name={row.name} secondary={[row.team, row.detail].filter(Boolean).join(" · ") || undefined} avatar={row.avatar} />,
        },
        { field: "recruits", headerName: "Recruits", width: 110, valueGetter: (_, row) => formatCount(row.recruits) },
        { field: "sold", headerName: "Sold", width: 100, valueGetter: (_, row) => formatCount(row.sold) },
        { field: "conversion", headerName: "Conversion", width: 120, valueGetter: (_, row) => `${row.conversion}%` },
        { field: "value", headerName: "New recruits' sales", width: 170, valueGetter: (_, row) => formatPeso(row.value) },
        { field: "total_sales", headerName: "Group total sales", width: 170, valueGetter: (_, row) => (row.total_sales !== null ? formatPeso(row.total_sales) : "—") },
        { field: "nao", headerName: "NAO (training)", width: 140, valueGetter: (_, row) => `${row.nao}%` },
        { field: "fire", headerName: "FIRE (training)", width: 140, valueGetter: (_, row) => `${row.fire}%` },
    ];

    return (
        <>
            <Box role="tablist" aria-label="Group by" sx={{ display: "flex", gap: 1, mb: 2, overflowX: "auto", scrollbarWidth: "none" }}>
                {options.groups.map((g) => {
                    const active = filters.group === g;
                    return (
                        <ButtonBase
                            key={g}
                            role="tab"
                            aria-selected={active}
                            onClick={() => table.setFilter("group", g)}
                            sx={{
                                px: 2,
                                py: 0.75,
                                borderRadius: 99,
                                fontSize: 14,
                                whiteSpace: "nowrap",
                                fontWeight: active ? 600 : 500,
                                color: active ? "var(--lr-primary)" : "var(--lr-text-body)",
                                backgroundColor: active ? "var(--lr-primary-soft)" : "var(--lr-surface-container)",
                            }}
                        >
                            {GROUP_LABELS[g].name}
                        </ButtonBase>
                    );
                })}
            </Box>

            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, mb: 2 }}>
                <DateRangeField value={{ from: filters.from, to: filters.to }} presets={reportPresets()} onChange={(range) => table.setFilters({ ...range })} />
                <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                    Recruits signed up in this range. NAO / FIRE are of those still training.
                </Typography>
                <Box sx={{ flex: 1 }} />
                <a href={`/superadmin/report-builder/recruits/export?${query.toString()}`} style={{ textDecoration: "none" }}>
                    <StyledButton variant="outlined" size="small" startIcon={<DownloadRounded />} sx={{ color: "var(--lr-primary)", borderColor: "var(--lr-outline)" }}>
                        Export CSV
                    </StyledButton>
                </a>
            </Box>

            <TableToolbar search={table.search} onSearch={table.setSearch} placeholder={label.search} />
            <DataTable {...table.gridProps} columns={columns} aria-label="Recruits report" />
        </>
    );
}

ReportBuilderRecruits.layout = (page: ReactNode) => <ReportBuilderLayout children={page} />;

export default ReportBuilderRecruits;
