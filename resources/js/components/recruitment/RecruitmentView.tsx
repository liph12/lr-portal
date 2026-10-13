import { ReactNode } from "react";
import { Box, Grid, IconButton, LinearProgress, MenuItem, TextField, Tooltip, Typography } from "@mui/material";
import { AccountCircleOutlined } from "@mui/icons-material";
import { GridColDef } from "@mui/x-data-grid";
import { router } from "@inertiajs/react";
import SectionTitle from "../utils/SectionTitle";
import SectionCard from "../cards/SectionCard";
import StatTile from "../charts/StatTile";
import BarList from "../charts/BarList";
import ShareBar from "../charts/ShareBar";
import DataTable from "../utils/tables/DataTable";
import TableToolbar from "../utils/tables/TableToolbar";
import PersonCell from "../utils/tables/PersonCell";
import StatusChip from "../utils/StatusChip";
import DateRangeField from "../utils/DateRangeField";
import ReportScopeHeader, { ReportScopeDetails } from "../reports/ReportScopeHeader";
import AreaOnlyNote from "./AreaOnlyNote";
import useServerTable, { ServerPage, TableFilters } from "../../hooks/useServerTable";
import { reportPresets } from "../../helpers/dateRanges";
import { formatCount } from "../../helpers/formatNumber";
import { formatDate } from "../../helpers/formatDate";

interface Trainee {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    area: string | null;
    team: string | null;
    sub_team: string | null;
    // name / email are null when the sponsor's account wasn't imported; then only their number is known.
    sponsor: { id: number; name: string | null; email: string | null } | null;
    status: string;
    signed_up: string;
    nao: number;
    fire: number;
    fire_pct: number;
}

export interface RecruitmentSummary {
    members: { total: number; by_status: Record<string, number> };
    recruits: { total: number; by_status: Record<string, number> };
    trainees: number;
    nao: { finished: number; not_finished: number; finished_pct: number; average_pct: number };
    fire: { levels: { label: string; count: number; pct: number }[]; complete_pct: number; average_pct: number };
}

export interface RecruitmentViewProps {
    filters: TableFilters & { from: string; to: string };
    scope: ReportScopeDetails | null;
    summary: RecruitmentSummary;
    trainees: ServerPage<Trainee>;
    statuses: string[];
}

interface Props extends RecruitmentViewProps {
    // Query keys to keep on every filter change (e.g. My Team's ?team=12).
    keep?: TableFilters;
    // Rendered above the cards (e.g. My Team's tabs).
    header?: ReactNode;
    // A row click: Reports › Recruits opens that person's own recruits (their downline); elsewhere their profile.
    onOpen?: (trainee: Trainee) => void;
    // The area every count is limited to, named on the cards.
    area?: string | null;
}

const selectSx = {
    minWidth: 170,
    "& .MuiOutlinedInput-root": { borderRadius: 99, backgroundColor: "var(--lr-surface-container)", fontSize: 14 },
    "& fieldset": { border: "none" },
};

const pct = (n: number) => `${n}%`;

function Progress({ value, label }: { value: number; label: string }) {
    return (
        <Box sx={{ width: "100%", display: "flex", alignItems: "center", gap: 1 }}>
            <LinearProgress
                variant="determinate"
                value={value}
                aria-label={label}
                sx={{
                    flex: 1,
                    height: 6,
                    borderRadius: 99,
                    backgroundColor: "var(--lr-surface-container)",
                    "& .MuiLinearProgress-bar": { borderRadius: 99, backgroundColor: value >= 100 ? "var(--lr-success-icon)" : "var(--lr-primary)" },
                }}
            />
            <Typography variant="caption" sx={{ width: 40, textAlign: "right", color: "var(--lr-text-body)" }}>
                {value}%
            </Typography>
        </Box>
    );
}

// Members, recruits and new sign-ups' NAO / FIRE progress: cards first, then the trainees table.
// Used by Dashboard › Overview and My Team › Recruits.
export default function RecruitmentView({ filters, scope, summary, trainees, statuses, keep = {}, header, onOpen, area = null }: Props) {
    const inArea = (title: string) => (area ? `${title} · ${area}` : title);
    const table = useServerTable("trainees", trainees, { ...filters, ...keep }, ["summary"]);
    const { members, recruits, nao, fire } = summary;

    const columns: GridColDef<Trainee>[] = [
        { field: "name", headerName: "Recruit", flex: 1.5, minWidth: 230, renderCell: ({ row }) => <PersonCell name={row.name} avatar={row.avatar} secondary={row.email} /> },
        // When a row opens the person's recruits, the profile stays one click away.
        ...(onOpen
            ? [
                  {
                      field: "profile",
                      headerName: "",
                      width: 56,
                      sortable: false,
                      renderCell: ({ row }: { row: Trainee }) => (
                          <Tooltip title="Open profile">
                              <IconButton
                                  size="small"
                                  aria-label={`Profile of ${row.name}`}
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      router.visit(`/agents/${row.id}`);
                                  }}
                                  sx={{ color: "var(--lr-text-secondary)" }}
                              >
                                  <AccountCircleOutlined fontSize="small" />
                              </IconButton>
                          </Tooltip>
                      ),
                  } as GridColDef<Trainee>,
              ]
            : []),
        {
            field: "sponsor",
            headerName: "Upline / sponsor",
            flex: 1,
            minWidth: 200,
            sortable: false,
            renderCell: ({ row }) =>
                row.sponsor ? (
                    <Box sx={{ lineHeight: 1.3, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontSize: 13, color: "var(--lr-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row.sponsor.name ?? "Not in the portal"}
                        </Typography>
                        <Typography variant="caption" component="div" sx={{ color: "var(--lr-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row.sponsor.email ?? `Member #${row.sponsor.id}`}
                        </Typography>
                    </Box>
                ) : (
                    "—"
                ),
        },
        // Inside one team (or sub-team) that column would only repeat it.
        ...(scope?.type === "team" || scope?.type === "sub_team" ? [] : [{ field: "team", headerName: "Team", flex: 1, minWidth: 140, sortable: false, valueGetter: (_: unknown, r: Trainee) => r.team ?? "—" } as GridColDef<Trainee>]),
        ...(scope?.type === "sub_team" ? [] : [{ field: "sub_team", headerName: "Sub-team", flex: 1, minWidth: 140, sortable: false, valueGetter: (_: unknown, r: Trainee) => r.sub_team ?? "—" } as GridColDef<Trainee>]),
        { field: "area", headerName: "Branch", width: 140, sortable: false, valueGetter: (_, r) => r.area ?? "—" },
        { field: "signed_up", headerName: "Signed up", width: 130, valueGetter: (_, r) => formatDate(r.signed_up) },
        { field: "nao", headerName: "NAO", width: 170, renderCell: ({ row }) => <Progress value={row.nao} label={`NAO ${row.nao}%`} /> },
        {
            field: "fire",
            headerName: "FIRE certificates",
            width: 190,
            renderCell: ({ row }) => (
                <Box sx={{ width: "100%" }}>
                    <Progress value={row.fire_pct} label={`FIRE ${row.fire_pct}%`} />
                    <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                        {row.fire} of 3{row.fire > 3 ? " (max reached)" : ""}
                    </Typography>
                </Box>
            ),
        },
        { field: "status", headerName: "Status", width: 120, sortable: false, renderCell: ({ row }) => <StatusChip status={row.status} /> },
    ];

    const statusBars = (counts: Record<string, number>) =>
        // Statistics fold resigned / terminated into inactive (User::statisticCounts); the table filter keeps all four.
        Object.keys(counts).map((s) => ({ name: s.charAt(0).toUpperCase() + s.slice(1), value: counts[s] ?? 0 }));

    return (
        <Box>
            {header}
            {scope && <ReportScopeHeader scope={scope} total={0} hideTotal />}

            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, mb: 3 }}>
                <DateRangeField label="Signed up" value={{ from: filters.from, to: filters.to }} presets={reportPresets()} onChange={(range) => table.setFilters({ ...range })} />
                <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                    Recruits and training are for members who signed up in this range.
                </Typography>
            </Box>
            {table.loading && <LinearProgress sx={{ height: 2, mb: 2 }} />}
            {area && <AreaOnlyNote area={area} />}

            {/* Cards */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <StatTile label={inArea("Members")} value={formatCount(members.total)} caption={`${formatCount(members.by_status.active ?? 0)} active now`} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <StatTile
                        label={inArea("New recruits")}
                        value={formatCount(recruits.total)}
                        caption={`${formatCount(recruits.by_status.active ?? 0)} active · ${formatCount(summary.trainees)} still in training, ${formatCount(recruits.total - summary.trainees)} already sold`}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <StatTile label="Finished NAO (100%)" value={pct(nao.finished_pct)} caption={`${formatCount(nao.finished)} of ${formatCount(summary.trainees)} new recruits without a sale`} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <StatTile label="FIRE complete (3 of 3)" value={pct(fire.complete_pct)} caption={`Average FIRE progress ${fire.average_pct}%`} />
                </Grid>
            </Grid>
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                    <SectionCard title={inArea("Members by status")}>
                        <BarList items={statusBars(members.by_status)} caption="All current members by account status" formatValue={formatCount} emptyText="No members." />
                    </SectionCard>
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                    <SectionCard title={inArea("New recruits by status")}>
                        <BarList items={statusBars(recruits.by_status)} caption="Members who signed up in the range, by account status" formatValue={formatCount} emptyText="No recruits in this range." />
                    </SectionCard>
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                    <SectionCard title={inArea("NAO")}>
                        <ShareBar
                            segments={[
                                { label: "Finished (100%)", value: nao.finished },
                                { label: "Not yet finished", value: nao.not_finished },
                            ]}
                            caption="New recruits without a sale, by NAO completion"
                            unit={["recruit", "recruits"]}
                            emptyText="No new recruits without a sale."
                        />
                        <Typography variant="caption" component="p" sx={{ mt: 1, color: "var(--lr-text-secondary)" }}>
                            Average progress {nao.average_pct}%
                        </Typography>
                    </SectionCard>
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                    <SectionCard title={inArea("FIRE certificates")}>
                        <BarList
                            items={fire.levels.map((l) => ({ name: l.label, value: l.count, detail: `${l.pct}%` }))}
                            caption="New recruits without a sale, by FIRE certificates (3 is complete)"
                            formatValue={formatCount}
                            emptyText="No new recruits without a sale."
                        />
                    </SectionCard>
                </Grid>
            </Grid>

            {/* Table */}
            {/* The table is the recruits still in training, so it's fewer than the New recruits card: say by how many. */}
            <SectionTitle
                title="New recruits in training"
                subtitle={`${formatCount(summary.trainees)} of the ${formatCount(recruits.total)} new recruits — the ${formatCount(recruits.total - summary.trainees)} who already made a sale are past onboarding and not listed here.`}
            />
            <TableToolbar
                search={table.search}
                onSearch={table.setSearch}
                placeholder="Search recruits"
                filters={
                    <>
                        <TextField select size="small" value={filters.nao ?? ""} onChange={(e) => table.setFilter("nao", e.target.value)} slotProps={{ select: { displayEmpty: true }, htmlInput: { "aria-label": "NAO" } }} sx={selectSx}>
                            <MenuItem value="">Any NAO progress</MenuItem>
                            <MenuItem value="finished">Finished NAO (100%)</MenuItem>
                            <MenuItem value="not_finished">Not yet finished</MenuItem>
                        </TextField>
                        <TextField select size="small" value={filters.fire ?? ""} onChange={(e) => table.setFilter("fire", e.target.value)} slotProps={{ select: { displayEmpty: true }, htmlInput: { "aria-label": "FIRE certificates" } }} sx={selectSx}>
                            <MenuItem value="">Any FIRE certificates</MenuItem>
                            <MenuItem value="0">0 of 3 (0%)</MenuItem>
                            <MenuItem value="1">1 of 3 (33%)</MenuItem>
                            <MenuItem value="2">2 of 3 (67%)</MenuItem>
                            <MenuItem value="complete">3 or more (100%)</MenuItem>
                        </TextField>
                        <TextField select size="small" value={filters.status ?? ""} onChange={(e) => table.setFilter("status", e.target.value)} slotProps={{ select: { displayEmpty: true }, htmlInput: { "aria-label": "Status" } }} sx={selectSx}>
                            <MenuItem value="">Any status</MenuItem>
                            {statuses.map((s) => (
                                <MenuItem key={s} value={s} sx={{ textTransform: "capitalize" }}>
                                    {s}
                                </MenuItem>
                            ))}
                        </TextField>
                    </>
                }
            />
            <DataTable
                {...table.gridProps}
                columns={columns}
                getRowHeight={() => 64}
                onRowClick={({ row }) => (onOpen ? onOpen(row as Trainee) : router.visit(`/agents/${row.id}`))}
                sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
                aria-label="New recruits in training"
            />
        </Box>
    );
}
