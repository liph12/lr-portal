import { ElementType, ReactNode, useEffect, useState } from "react";
import {
    ApartmentRounded,
    ArrowBackRounded,
    BadgeRounded,
    BarChartRounded,
    ChevronRightRounded,
    Diversity3Rounded,
    GroupsRounded,
    HandshakeRounded,
    HomeWorkRounded,
    KeyRounded,
    PersonRounded,
    ReceiptLongRounded,
    StoreRounded,
    WorkspacePremiumRounded,
} from "@mui/icons-material";
import { Link, router } from "@inertiajs/react";
import { Box, Container, LinearProgress, MenuItem, TextField, Typography } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import SectionTitle from "../utils/SectionTitle";
import DataTable from "../utils/tables/DataTable";
import TableToolbar from "../utils/tables/TableToolbar";
import PersonCell from "../utils/tables/PersonCell";
import StyledButton from "../utils/StyledButton";
import DateRangeField from "../utils/DateRangeField";
import ReportStatistics, { CATEGORY_LABELS, ReportSummary } from "./ReportStatistics";
import ReportScopeHeader, { ReportScopeDetails } from "./ReportScopeHeader";
import ReportSaleList, { ReportSaleRow } from "./ReportSaleList";
import ReportSectionCards, { ReportSection } from "./ReportSectionCards";
import { SaleDetail } from "../sales/SaleDetailsForm";
import useServerTable, { ServerPage, TableFilters } from "../../hooks/useServerTable";
import { formatCount, formatPeso } from "../../helpers/formatNumber";
import { reportPresets } from "../../helpers/dateRanges";

export type { ReportSummary } from "./ReportStatistics";

export interface ReportRow {
    // Areas use their key ("cebu"); everything else a numeric id.
    id: number | string;
    name: string;
    detail: string | null;
    avatar: string | null;
    // Where the row belongs: the agent's (or team leader's) area, and the agent's current / sub-team's team.
    area: string | null;
    team: string | null;
    value: number;
    // How many sales make up the total — "units" (one per sale, whatever the category).
    sales: number;
}

export interface ReportFilters extends TableFilters {
    from: string;
    to: string;
    category: string | null;
    status: string;
    view: string;
    // Inside a developer: "sales" lists its sales one by one; inside a developer or a branch "teams" / "sub_teams" rank its groups.
    list?: string | null;
    developer_id?: number | null;
}

// The group a drill-down is limited to (clicked from the Teams / Sub-teams / Developers / Areas table).
export type ReportScope = ReportScopeDetails;

export interface SalesReportViewProps {
    filters: ReportFilters;
    // Inside a developer or a branch, offer Top teams / Top sub-teams (Reports, for the back office and office secretaries).
    groupTabs?: boolean;
    // The drill-down trail, broadest first — empty when nothing's drilled into (SalesReportService::scopeTrail).
    scope?: ReportScope[];
    summary: ReportSummary;
    breakdown: ServerPage<ReportRow>;
    options: { categories: string[]; statuses: string[]; views: string[] };
    title: string;
    subtitle: string;
    // A single report (Reports › …): no view tabs; otherwise tabs switch between views.
    fixedView?: boolean;
    // Shown as a back link above the title.
    backHref?: string;
    // The scope can't be cleared (My Team is always about the leader's own team).
    lockScope?: boolean;
    // Rendered between the title and the filters (e.g. My Team's tabs and team switcher).
    header?: ReactNode;
    // An area picker (Developers by Area): area key => name.
    areaOptions?: Record<string, string> | null;
    // Inside a developer, the Sales tab (`list=sales`): its sales one by one.
    saleList?: ServerPage<ReportSaleRow> | null;
    // A sale opened from that list (read-only).
    saleDetail?: SaleDetail | null;
}

const VIEWS: Record<string, { label: string; column: string; search: string }> = {
    agents: { label: "Agents", column: "Agent", search: "Search agents" },
    teams: { label: "Teams", column: "Team", search: "Search teams" },
    sub_teams: { label: "Sub-teams", column: "Sub-team", search: "Search sub-teams" },
    areas: { label: "Branches", column: "Branch", search: "Search branches" },
    developers: { label: "Developers", column: "Developer", search: "Search developers" },
    projects: { label: "Projects", column: "Project", search: "Search projects" },
    brokerage: { label: "Brokerage", column: "Agent", search: "Search agents" },
    rental: { label: "Rental", column: "Agent", search: "Search agents" },
    unit_managers: { label: "Unit managers", column: "Unit manager", search: "Search unit managers" },
    team_leaders: { label: "Team leaders", column: "Team leader", search: "Search team leaders" },
};

const VIEW_ICONS: Record<string, ElementType> = {
    agents: PersonRounded,
    teams: GroupsRounded,
    sub_teams: Diversity3Rounded,
    areas: StoreRounded,
    developers: ApartmentRounded,
    projects: HomeWorkRounded,
    brokerage: HandshakeRounded,
    rental: KeyRounded,
    unit_managers: BadgeRounded,
    team_leaders: WorkspacePremiumRounded,
};

// Rows of these views open that group's top agents.
const DRILL: Record<string, { key: string; label: string; hint: string }> = {
    teams: { key: "team_id", label: "Team", hint: "Click a team to see its top agents." },
    sub_teams: { key: "sub_team_id", label: "Sub-team", hint: "Click a sub-team to see its top agents." },
    developers: { key: "developer_id", label: "Developer", hint: "Click a developer to see the top agents selling its projects." },
    areas: { key: "area", label: "Branch", hint: "Click a branch to see its top agents." },
};
const SCOPE_KEYS = { team: "team_id", sub_team: "sub_team_id", developer: "developer_id", area: "area", agent: "agent_id", property_type: "property_type_id", project: "project_name", unit_type: "unit_type" } as const;
const NO_SCOPE = { team_id: "", sub_team_id: "", developer_id: "", area: "" };

// Rows of these views are people: clicking opens the agent's profile.
const PEOPLE = ["agents", "rental", "brokerage", "unit_managers", "team_leaders"];

// Which "where they belong" columns make sense per view.
const SHOW_AREA = ["agents", "rental", "brokerage", "unit_managers", "team_leaders", "teams", "sub_teams"];
const SHOW_TEAM = ["agents", "rental", "brokerage", "unit_managers", "team_leaders", "sub_teams"];

// Views tied to one category; the category filter is fixed while they're open.
const VIEW_CATEGORY: Record<string, string> = { developers: "project", brokerage: "brokerage", rental: "rental" };

const selectSx = {
    minWidth: 150,
    "& .MuiOutlinedInput-root": { borderRadius: 99, backgroundColor: "var(--lr-surface-container)", fontSize: 14 },
    "& fieldset": { border: "none" },
};

// The sales report body: filters, the ranked table first, then the statistics underneath.
// Used by Dashboard › View Sales (with view tabs) and by each card under Reports (one view).
export default function SalesReportView({ filters, scope = [], summary, breakdown, options, title, subtitle, fixedView = false, backHref, lockScope = false, header, areaOptions = null, saleList = null, saleDetail = null, groupTabs = false }: SalesReportViewProps) {
    // The scope header changes with a drill-down, so it reloads with the table.
    const table = useServerTable("breakdown", breakdown, filters, ["summary", "scope", "saleList"]);
    // A developer opens on its top agents; the Sales tab lists its sales one by one (same filters, read-only). Keyed
    // off the filter itself, not scope's last entry — a property type / unit type clicked afterwards narrows the
    // trail further, but developer_id stays active and combined underneath.
    const insideDeveloper = !!filters.developer_id;
    // A branch (clicked, or an office secretary's own) can rank its teams / sub-teams too — same reasoning.
    const insideBranch = !!filters.area;
    // The narrowest / current level (ReportScopeHeader's big banner); undefined when nothing's drilled into.
    const currentScope = scope[scope.length - 1];

    const view = VIEWS[filters.view] ?? VIEWS.agents;
    const lockedCategory = VIEW_CATEGORY[filters.view] ?? (insideDeveloper ? "project" : undefined);
    // A locked report can't be narrowed to another group; a developer can still be opened within it.
    const drill = lockScope ? (filters.view === "developers" ? DRILL.developers : undefined) : DRILL[filters.view];
    const isPeople = PEOPLE.indexOf(filters.view) !== -1;
    const clickable = isPeople || !!drill;

    // Same dates and status, limited to the clicked group. A single report jumps to Top Agents; View Sales switches tab.
    const openRow = (row: ReportRow) => {
        if (!row.id) return;
        if (isPeople) {
            // Their sales one by one, for the same dates, status and category.
            const category = lockedCategory ?? filters.category ?? "";
            router.visit(`/agents/${row.id}/sales?from=${filters.from}&to=${filters.to}&status=${filters.status}${category ? `&category=${category}` : ""}`);
            return;
        }
        if (!drill) return;
        // A developer opened from an area keeps the area: its agents who sold there. A team / sub-team ranked inside a
        // developer or a branch keeps it: that group's agents for that developer / in that branch.
        const keep = {
            from: filters.from,
            to: filters.to,
            status: filters.status,
            category: filters.category ?? "",
            area: drill.key === "developer_id" || insideBranch ? String(filters.area ?? "") : "",
            developer_id: insideDeveloper && drill.key !== "developer_id" ? String(filters.developer_id ?? "") : "",
        };
        if (fixedView) {
            router.get("/reports/top-agents", Object.fromEntries(Object.entries({ ...keep, [drill.key]: row.id }).filter(([, v]) => v !== "")));
        } else {
            table.drillInto({ ...NO_SCOPE, view: "agents", [drill.key]: row.id, sort: "", dir: "" });
        }
    };

    const columns: GridColDef<ReportRow>[] = [
        {
            field: "name",
            headerName: view.column,
            flex: 1.6,
            minWidth: 240,
            renderCell: ({ row }) => (
                <PersonCell name={row.name} avatar={row.avatar} secondary={row.detail ?? undefined} hideAvatar={!isPeople && filters.view !== "teams" && filters.view !== "sub_teams"} />
            ),
        },
        ...(SHOW_AREA.indexOf(filters.view) !== -1
            ? [{ field: "area", headerName: "Branch", flex: 1, minWidth: 150, sortable: false, valueGetter: (_: unknown, row: ReportRow) => row.area ?? "—" } as GridColDef<ReportRow>]
            : []),
        // Inside one team or sub-team every row has the same team, so the column would only repeat it.
        ...(SHOW_TEAM.indexOf(filters.view) !== -1 && currentScope?.type !== "team" && currentScope?.type !== "sub_team"
            ? [{ field: "team", headerName: "Team", flex: 1, minWidth: 160, sortable: false, valueGetter: (_: unknown, row: ReportRow) => row.team ?? "—" } as GridColDef<ReportRow>]
            : []),
        { field: "sales", headerName: "Total units", type: "number", flex: 0.7, minWidth: 120, sortable: false, valueFormatter: (v: number) => formatCount(v) },
        { field: "value", headerName: "Total sales", type: "number", flex: 1, minWidth: 170, valueFormatter: (v: number) => formatPeso(v) },
        ...(clickable
            ? [{ field: "open", headerName: "", width: 56, sortable: false, renderCell: () => <ChevronRightRounded sx={{ color: "var(--lr-text-secondary)" }} /> } as GridColDef<ReportRow>]
            : []),
    ];

    const hint = isPeople ? "Click an agent to open their profile." : drill?.hint;

    // Inside a developer or a branch: its own Top agents / Top teams / Top sub-teams / Projects / Sales, instead of the
    // cross-view switcher. A fixed single report (Reports › …) never switches view at the top level — only one of
    // these two card rows ever shows.
    const showListSwitch = insideDeveloper || (insideBranch && groupTabs);
    const listSections: ReportSection[] = [
        { value: "", label: "Top agents", icon: PersonRounded },
        ...(groupTabs ? [{ value: "teams", label: "Top teams", icon: GroupsRounded }, { value: "sub_teams", label: "Top sub-teams", icon: Diversity3Rounded }] : []),
        ...(insideDeveloper ? [{ value: "projects", label: "Projects", icon: HomeWorkRounded }, { value: "sales", label: "Sales", icon: ReceiptLongRounded }] : []),
    ];
    const viewSections: ReportSection[] = options.views.map((v) => ({ value: v, label: VIEWS[v]?.label ?? v, icon: VIEW_ICONS[v] ?? PersonRounded }));
    // A fixed report with nothing to switch between still gets a card — for its one view, labelled like the page itself.
    const dataSections: ReportSection[] = showListSwitch ? listSections : !fixedView ? viewSections : [{ value: filters.view, label: title, icon: VIEW_ICONS[filters.view] ?? PersonRounded }];
    const sections: ReportSection[] = [...dataSections, { value: "statistics", label: "Statistics", icon: BarChartRounded }];

    // What's "naturally" showing from the filters alone; Statistics is the only section that isn't (so re-syncing on
    // navigation — a new drill-down, a different view — always drops out of it back to the new natural section).
    const naturalSection = showListSwitch ? (filters.list ?? "") : filters.view;
    const [activeSection, setActiveSection] = useState(naturalSection);
    useEffect(() => setActiveSection(naturalSection), [naturalSection]);

    const selectSection = (value: string) => {
        setActiveSection(value);
        if (value === "statistics") return;
        if (showListSwitch) {
            table.setFilter("list", value);
        } else if (!fixedView) {
            table.setFilters({ ...NO_SCOPE, view: value, sort: "", dir: "" });
        }
    };

    const showStatistics = activeSection === "statistics";
    const showSales = !showStatistics && showListSwitch && activeSection === "sales" && !!saleList;
    const activeLabel = sections.find((s) => s.value === activeSection)?.label ?? title;

    // Broadest first, matching SalesReportService::SCOPE_ORDER — which keys to clear to jump back to (or past) a level.
    const SCOPE_TRAIL_ORDER: ReportScope["type"][] = ["team", "sub_team", "area", "developer", "project", "property_type", "unit_type", "agent"];
    const clearScopeAfter = (type: ReportScope["type"]) => {
        const changes: Record<string, string> = {};
        SCOPE_TRAIL_ORDER.slice(SCOPE_TRAIL_ORDER.indexOf(type) + 1).forEach((t) => (changes[SCOPE_KEYS[t]] = ""));
        table.drillInto(changes);
    };
    const clearScopeAll = () => {
        const changes: Record<string, string> = {};
        SCOPE_TRAIL_ORDER.forEach((t) => (changes[SCOPE_KEYS[t]] = ""));
        table.drillInto(changes);
    };

    return (
        <Container sx={{ py: { xs: 3, sm: 4 } }} maxWidth="xl">
            {backHref && (
                <Link href={backHref} style={{ textDecoration: "none" }}>
                    <StyledButton size="small" variant="text" startIcon={<ArrowBackRounded />} sx={{ mb: 1, px: 1, color: "var(--lr-primary)" }}>
                        All reports
                    </StyledButton>
                </Link>
            )}
            {/* A Reports card's title/description name one specific view ("Top Agents", ranked by agents) — once
                narrowed to something else (a property type, a developer…) it no longer describes what's showing, so
                ReportScopeHeader (right below) names it instead. View Sales / My Team / Report Builder's own title
                never makes that claim (no backHref), so it stays put regardless of scope. */}
            {(scope.length === 0 || !backHref) && <SectionTitle title={title} subtitle={subtitle} />}
            {header}
            {scope.length > 0 && (
                <ReportScopeHeader
                    scope={scope}
                    total={summary.kpis.value.value}
                    onClear={lockScope ? undefined : clearScopeAll}
                    onNavigate={lockScope ? undefined : clearScopeAfter}
                />
            )}

            {/* Filters: date range (with quick ranges), category and status */}
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, mb: 3 }}>
                <DateRangeField value={{ from: filters.from, to: filters.to }} presets={reportPresets()} onChange={(range) => table.setFilters({ ...range })} />
                <TextField
                    select
                    size="small"
                    label="Category"
                    value={lockedCategory ?? filters.category ?? ""}
                    disabled={!!lockedCategory}
                    onChange={(e) => table.setFilter("category", e.target.value)}
                    slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
                    sx={selectSx}
                >
                    <MenuItem value="">All categories</MenuItem>
                    {options.categories.map((c) => (
                        <MenuItem key={c} value={c}>
                            {CATEGORY_LABELS[c] ?? c}
                        </MenuItem>
                    ))}
                </TextField>
                {areaOptions && (
                    <TextField
                        select
                        size="small"
                        label="Branch"
                        value={filters.area ?? ""}
                        onChange={(e) => table.setFilter("area", e.target.value)}
                        slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
                        sx={selectSx}
                    >
                        <MenuItem value="">All branches</MenuItem>
                        {Object.entries(areaOptions).map(([key, name]) => (
                            <MenuItem key={key} value={key}>
                                {name}
                            </MenuItem>
                        ))}
                    </TextField>
                )}
                <TextField
                    select
                    size="small"
                    label="Status"
                    value={filters.status}
                    onChange={(e) => table.setFilter("status", e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={selectSx}
                >
                    <MenuItem value="all">All statuses</MenuItem>
                    {options.statuses.map((s) => (
                        <MenuItem key={s} value={s} sx={{ textTransform: "capitalize" }}>
                            {s}
                        </MenuItem>
                    ))}
                </TextField>
            </Box>
            {table.loading && <LinearProgress sx={{ height: 2, mb: 2 }} />}

            {/* Pick a card first — only the one picked renders below, so there's nothing to scroll past. */}
            <ReportSectionCards sections={sections} active={activeSection} onSelect={selectSection} aria-label="Report sections" />

            {/* Statistics shows its own heading + subtitle below; naming it again here would just repeat it. */}
            {!showStatistics && (
                <Typography component="h2" sx={{ fontSize: 20, fontWeight: 600, color: "var(--lr-text-primary)", mb: 1.5 }}>
                    {activeLabel}
                </Typography>
            )}
            {!showStatistics && hint && (
                <Typography variant="body2" sx={{ mb: 1, color: "var(--lr-text-secondary)" }}>
                    {hint}
                </Typography>
            )}
            {showStatistics ? (
                <ReportStatistics
                    summary={summary}
                    showCategories={!lockedCategory}
                    showAreas={filters.view !== "areas" && currentScope?.type !== "area"}
                    onUnitTypeClick={(propertyTypeId, name) => table.drillInto({ property_type_id: propertyTypeId, unit_type: name })}
                />
            ) : showSales ? (
                <ReportSaleList sales={saleList!} filters={filters} detail={saleDetail} />
            ) : (
                <>
                    <TableToolbar search={table.search} onSearch={table.setSearch} placeholder={view.search} />
                    <DataTable
                        {...table.gridProps}
                        columns={columns}
                        getRowHeight={() => 56}
                        aria-label={`Sales by ${view.label.toLowerCase()}`}
                        onRowClick={clickable ? ({ row }) => openRow(row as ReportRow) : undefined}
                        sx={clickable ? { "& .MuiDataGrid-row": { cursor: "pointer" } } : undefined}
                    />
                </>
            )}
            {!showStatistics && (filters.view === "teams" || filters.view === "sub_teams" || !fixedView) && (
                <Typography variant="caption" component="p" sx={{ mt: 1, color: "var(--lr-text-secondary)" }}>
                    Teams and sub-teams credit each sale to the team its agent was on at the reservation date. A team's area is its leader's.
                </Typography>
            )}
        </Container>
    );
}
