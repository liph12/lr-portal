import { ElementType, ReactNode, useLayoutEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { AccountBalanceWalletRounded, GroupAddRounded, InsightsRounded, PaymentsRounded, SchoolRounded, TrendingUpRounded } from "@mui/icons-material";
import AppLogo from "../utils/AppLogo";
import StatTile from "../charts/StatTile";
import ShareBar from "../charts/ShareBar";
import BarList from "../charts/BarList";
import MonthlyColumnChart from "../charts/MonthlyColumnChart";
import { StatusBuckets } from "./RecruitsPanel";
import RecruitsAnalysis, { Part, RecruitsAnalysisData } from "./RecruitsAnalysis";
import { PDF_PAGE } from "../../helpers/exportPdf";
import { formatCount, formatPeso, formatPesoExact } from "../../helpers/formatNumber";
import { formatDate } from "../../helpers/formatDate";

export type Group = "teams" | "sub_teams" | "areas" | "sponsors" | "recruits";

export interface Measures {
    nao_status: StatusBuckets;
    fire_status: StatusBuckets;
    overall_status: StatusBuckets;
    recruits: number;
    sold: number;
    conversion: number;
    // What the new recruits sold; the group's (or the selection's) whole total in the range, old members' too — null for a sponsor.
    value: number;
    total_sales?: number | null;
    trainees: number;
    nao_finished: number;
    nao: number;
    fire_complete: number;
    fire: number;
}

export interface ProgressRow extends Measures {
    id: number | string;
    name: string;
    detail: string | null;
    avatar: string | null;
    // The sponsor's current team (By agent tab).
    team: string | null;
}

// The Recruits tab: one recruit per row.
export interface RecruitRow {
    id: number;
    name: string;
    detail: string | null;
    avatar: string | null;
    sponsor: string | null;
    team: string | null;
    sub_team: string | null;
    area: string | null;
    signed_up: string;
    sold: boolean;
    value: number;
    nao: number;
    fire: number;
}

export interface RecruitsSummary {
    kpis: Measures;
    areas: (Measures & { area: string | null; name: string })[];
    trend: { month: string; sales: number; value: number }[];
}

interface RecruitsProgressPdfProps {
    // Who the report is about ("FH VIP · Team"), or everyone.
    subject: string;
    from: string;
    to: string;
    summary: RecruitsSummary;
    group: Group | null;
    groupTitle: string;
    columnTitle: string;
    rows: (ProgressRow | RecruitRow)[];
    total: number;
    // The AI analysis generated on the page for this team / sub-team, if any: its own pages after the charts.
    analysis?: { data: RecruitsAnalysisData; name: string; kind: "team" | "sub-team" } | null;
}

// The analysis' pages: what each holds.
const ANALYSIS_PAGES: Part[][] = [["summary", "contribution", "training"], ["outlook"], ["strategies", "note"]];

const ROWS_PER_PAGE = 13;
const TOP_BRANCHES = 8;

const GROUP_TOTAL: Partial<Record<Group, string>> = { teams: "Team total sales", sub_teams: "Sub-team total sales", areas: "Branch total sales" };

const CHART_LABELS = {
    value: "New recruits' total sales",
    count: "New recruits",
    valueToggle: "Their sales",
    countToggle: "New recruits",
    dated: "by sign-up month",
};

const pctOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

function Page({ number, of, subject, range, children }: { number: number; of: number; subject: string; range: string; children: ReactNode }) {
    return (
        <Box
            className="lr-pdf-page"
            sx={{ width: PDF_PAGE.width, height: PDF_PAGE.height, boxSizing: "border-box", px: "44px", py: "32px", display: "flex", flexDirection: "column", backgroundColor: "var(--lr-page)", color: "var(--lr-text-body)" }}
        >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: "14px", mb: "20px", borderBottom: "2px solid var(--lr-primary)" }}>
                <AppLogo sx={{ height: 30, width: "auto" }} />
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: "var(--lr-text-secondary)" }}>Recruits Progress · {subject}</Typography>
            </Box>
            <Fit>{children}</Fit>
            <Box sx={{ display: "flex", justifyContent: "space-between", pt: "10px", mt: "12px", borderTop: "1px solid var(--lr-border)", fontSize: 11, color: "var(--lr-text-secondary)" }}>
                <span>Signed up {range} · generated {formatDate(new Date().toISOString().slice(0, 10))}</span>
                <span>
                    Page {number} of {of}
                </span>
            </Box>
        </Box>
    );
}

// Untitled for a chart, whose own caption names it.
// A page's body, shrunk to fit when its text runs long (the AI's answers vary in length); never enlarged.
function Fit({ children }: { children: ReactNode }) {
    const outer = useRef<HTMLDivElement>(null);
    const inner = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    // The largest scale whose layout fits: shrinking widens the text, which shortens it, so search rather than divide.
    useLayoutEffect(() => {
        const box = inner.current;
        const room = outer.current?.clientHeight ?? 0;
        if (!box || !room) return;
        const fits = (s: number) => {
            box.style.width = `${100 / s}%`;
            return box.offsetHeight * s <= room;
        };
        box.style.flex = "none";
        let best = 1;
        if (!fits(1)) {
            let [low, high] = [0.4, 1];
            for (let i = 0; i < 8; i++) {
                const mid = (low + high) / 2;
                [low, high] = fits(mid) ? [mid, high] : [low, mid];
            }
            best = low;
        }
        box.style.width = "";
        box.style.flex = "";
        setScale(best);
    }, []);

    return (
        <Box ref={outer} sx={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <Box ref={inner} sx={{ display: "flex", flexDirection: "column", flex: scale === 1 ? 1 : "none", width: `${100 / scale}%`, transform: `scale(${scale})`, transformOrigin: "top left" }}>
                {children}
            </Box>
        </Box>
    );
}

function Card({ title, icon: Icon, children }: { title?: string; icon?: ElementType; children: ReactNode }) {
    return (
        <Box sx={{ position: "relative", overflow: "hidden", borderRadius: "12px", border: "1px solid var(--lr-border)", backgroundColor: "var(--lr-surface)", p: "16px 20px", height: "100%", boxSizing: "border-box" }}>
            {title && <Typography sx={{ fontSize: 15, fontWeight: 700, color: "var(--lr-text-primary)", mb: "12px" }}>{title}</Typography>}
            {children}
            {Icon && <Icon aria-hidden sx={{ position: "absolute", right: -14, bottom: -18, fontSize: 104, color: "var(--lr-primary)", opacity: 0.07 }} />}
        </Box>
    );
}

function Bar({ value, caption }: { value: number | null; caption?: string }) {
    return (
        <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Box sx={{ flex: 1, height: 6, borderRadius: 99, backgroundColor: "var(--lr-surface-container)", overflow: "hidden" }}>
                    <Box sx={{ width: `${Math.min(value ?? 0, 100)}%`, height: "100%", borderRadius: 99, backgroundColor: "var(--lr-primary)" }} />
                </Box>
                <Box component="span" sx={{ width: 42, textAlign: "right", fontWeight: 600, fontSize: 12, color: "var(--lr-text-primary)" }}>
                    {value === null ? "—" : `${value}%`}
                </Box>
            </Box>
            {caption && <Box sx={{ fontSize: 10.5, color: "var(--lr-text-secondary)", mt: "2px" }}>{caption}</Box>}
        </Box>
    );
}

function Name({ name, detail }: { name: string; detail: string | null }) {
    return (
        <>
            <Box sx={{ fontWeight: 600, color: "var(--lr-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</Box>
            {detail && <Box sx={{ fontSize: 10.5, color: "var(--lr-text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{detail}</Box>}
        </>
    );
}

// The columns of each tab: [title, width, cell].
type Column<R> = [string, string, (row: R) => ReactNode];

function groupColumns(group: Group, columnTitle: string): Column<ProgressRow>[] {
    const total = GROUP_TOTAL[group];
    return [
        [columnTitle, "auto", (r) => <Name name={r.name} detail={group === "sponsors" ? r.team : r.detail} />],
        ["New recruits", "92px", (r) => formatCount(r.recruits)],
        ["Who sold", "150px", (r) => <Bar value={r.conversion} caption={`${formatCount(r.sold)} of ${formatCount(r.recruits)}`} />],
        ["NAO finished", "150px", (r) => <Bar value={r.nao} caption={`${formatCount(r.nao_finished)} of ${formatCount(r.trainees)} in training`} />],
        ["FIRE complete", "150px", (r) => <Bar value={r.fire} caption={`${formatCount(r.fire_complete)} of ${formatCount(r.trainees)} in training`} />],
        ["New recruits' total sales", "150px", (r) => formatPeso(r.value)],
        ...(total ? [[total, "150px", (r: ProgressRow) => (r.total_sales === null || r.total_sales === undefined ? "—" : formatPeso(r.total_sales))] as Column<ProgressRow>] : []),
    ];
}

const recruitColumns: Column<RecruitRow>[] = [
    ["Recruit", "auto", (r) => <Name name={r.name} detail={r.detail} />],
    ["Sponsor / upline", "160px", (r) => r.sponsor ?? "—"],
    ["Team / sub-team", "180px", (r) => <Name name={r.team ?? "—"} detail={r.sub_team} />],
    ["Signed up", "92px", (r) => formatDate(r.signed_up)],
    ["Sales", "110px", (r) => (r.sold ? formatPeso(r.value) : "No sale yet")],
    ["NAO", "120px", (r) => <Bar value={r.nao} />],
    ["FIRE", "120px", (r) => <Bar value={Math.min(100, Math.round((r.fire / 3) * 100))} caption={`${Math.min(r.fire, 3)} of 3`} />],
];

function Table<R>({ columns, rows, start }: { columns: Column<R>[]; rows: R[]; start: number }) {
    return (
        <Box
            component="table"
            sx={{
                width: "100%",
                tableLayout: "fixed",
                borderCollapse: "separate",
                borderSpacing: 0,
                fontSize: 12,
                backgroundColor: "var(--lr-surface)",
                border: "1px solid var(--lr-border)",
                borderRadius: "12px",
                overflow: "hidden",
                "& th": { textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--lr-text-secondary)", backgroundColor: "var(--lr-surface-dim)", px: "10px", py: "9px", borderBottom: "1px solid var(--lr-border)" },
                "& td": { px: "10px", height: 38, borderBottom: "1px solid var(--lr-border)", color: "var(--lr-text-body)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
                "& tr:last-of-type td": { borderBottom: 0 },
                "& tbody tr:nth-of-type(even) td": { backgroundColor: "var(--lr-surface-dim)" },
            }}
        >
            <colgroup>
                <col style={{ width: 40 }} />
                {columns.map(([title, width]) => (
                    <col key={title} style={{ width }} />
                ))}
            </colgroup>
            <thead>
                <tr>
                    <th>#</th>
                    {columns.map(([title]) => (
                        <th key={title}>{title}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, i) => (
                    <tr key={i}>
                        <td style={{ color: "var(--lr-text-secondary)", fontWeight: 600 }}>{start + i + 1}</td>
                        {columns.map(([title, , cell]) => (
                            <td key={title}>{cell(row)}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </Box>
    );
}

// The Recruits Progress report as A4 landscape pages, drawn off-screen in the light scheme for helpers/exportPdf: the summary
// with its tiles and NAO / FIRE bars, the charts, then the whole table (the tab being viewed), numbered.
export default function RecruitsProgressPdf({ subject, from, to, summary, group, groupTitle, columnTitle, rows, total, analysis = null }: RecruitsProgressPdfProps) {
    const { kpis } = summary;
    const range = `${formatDate(from)} – ${formatDate(to)}`;
    const compare = kpis.total_sales !== null && kpis.total_sales !== undefined;
    const chunks: (ProgressRow | RecruitRow)[][] = [];
    for (let i = 0; i < rows.length; i += ROWS_PER_PAGE) chunks.push(rows.slice(i, i + ROWS_PER_PAGE));
    if (group && chunks.length === 0) chunks.push([]);
    const aiPages = analysis?.data.ai ? ANALYSIS_PAGES : [];
    const pages = 2 + aiPages.length + chunks.length;
    const page = { of: pages, subject, range };

    const breakdowns: [string, StatusBuckets, [string, string, string]][] = [
        ["NAO", kpis.nao_status, ["Not yet started", "On progress", "Finished"]],
        ["FIRE", kpis.fire_status, ["Not yet started", "On progress", "Finished"]],
        ["Overall", kpis.overall_status, ["No activity", "On progress", "Completed"]],
    ];

    return (
        <Box className="lr-print" aria-hidden sx={{ position: "fixed", left: -20000, top: 0, width: PDF_PAGE.width, pointerEvents: "none" }}>
            <Page number={1} {...page}>
                <Box sx={{ display: "flex", gap: "14px", mb: "22px" }}>
                    <Box sx={{ width: 5, borderRadius: 99, backgroundColor: "var(--lr-accent)" }} />
                    <Box>
                        <Typography sx={{ fontSize: 30, fontWeight: 800, lineHeight: 1.15, color: "var(--lr-text-primary)" }}>Recruits Progress</Typography>
                        <Typography sx={{ fontSize: 18, fontWeight: 600, color: "var(--lr-primary)", mt: "4px" }}>{subject}</Typography>
                        <Typography sx={{ fontSize: 13, color: "var(--lr-text-secondary)", mt: "2px" }}>
                            Members who signed up {range}: how many have sold, their sales, and NAO / FIRE for the ones still in training.
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", mb: "14px" }}>
                    <StatTile icon={GroupAddRounded} label="New recruits" value={formatCount(kpis.recruits)} caption={`Signed up ${range}`} />
                    <StatTile icon={TrendingUpRounded} label="New recruits who sold" value={formatCount(kpis.sold)} caption={`${kpis.conversion}% of new recruits`} />
                    <StatTile icon={SchoolRounded} label="Still in training" value={formatCount(kpis.trainees)} caption="New recruits with no sale yet" />
                    <StatTile icon={PaymentsRounded} label="New recruits' total sales" value={formatPesoExact(kpis.value)} caption="Their valid sales, any date" />
                </Box>
                {compare && (
                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", mb: "14px" }}>
                        <StatTile icon={AccountBalanceWalletRounded} label="Total sales — all members" value={formatPesoExact(kpis.total_sales ?? 0)} caption={`Valid sales reserved ${range}, old members included`} />
                        <StatTile
                            icon={InsightsRounded}
                            label="New recruits' share of the total"
                            value={(kpis.total_sales ?? 0) > 0 ? `${pctOf(kpis.value, kpis.total_sales ?? 0)}%` : "—"}
                            caption="New recruits' total sales ÷ total sales"
                        />
                    </Box>
                )}
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
                    {breakdowns.map(([title, buckets, labels]) => (
                        <Card key={title} title={`${title} · ${formatCount(kpis.trainees)} in training`}>
                            <ShareBar
                                segments={labels.map((label, i) => ({ label, value: [buckets.not_started, buckets.in_progress, buckets.finished][i] }))}
                                caption={`${title} progress of new recruits still in training`}
                                unit={["recruit", "recruits"]}
                                emptyText="Nobody in training."
                            />
                        </Card>
                    ))}
                </Box>
            </Page>

            <Page number={2} {...page}>
                <Box sx={{ display: "grid", gridTemplateColumns: "5fr 7fr", gap: "16px", flex: 1, minHeight: 0 }}>
                    <Card title="Top branches">
                        <BarList
                            items={summary.areas.slice(0, TOP_BRANCHES).map((a) => ({ name: a.name, value: a.recruits, detail: `${a.conversion}% sold · NAO ${a.nao}% · FIRE ${a.fire}%` }))}
                            caption="New recruits by branch"
                            formatValue={formatCount}
                            emptyText="No recruits in this range."
                        />
                    </Card>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: "16px", minHeight: 0 }}>
                        <Card>
                            <MonthlyColumnChart data={summary.trend} labels={CHART_LABELS} metric="sales" />
                        </Card>
                        <Card>
                            <MonthlyColumnChart data={summary.trend} labels={CHART_LABELS} metric="value" />
                        </Card>
                    </Box>
                </Box>
            </Page>

            {analysis &&
                aiPages.map((parts, i) => (
                    <Page key={`ai-${i}`} number={3 + i} {...page}>
                        {i === 0 && (
                            <Typography sx={{ fontSize: 22, fontWeight: 800, color: "var(--lr-text-primary)", mb: "4px" }}>
                                AI analysis · {analysis.name}
                            </Typography>
                        )}
                        <RecruitsAnalysis print parts={parts} name={analysis.name} kind={analysis.kind} analysis={analysis.data} />
                    </Page>
                ))}

            {group &&
                chunks.map((chunk, i) => (
                    <Page key={i} number={3 + aiPages.length + i} {...page}>
                        <Typography sx={{ fontSize: 17, fontWeight: 700, color: "var(--lr-text-primary)", mb: "4px" }}>
                            {groupTitle}
                            {i > 0 && <Box component="span" sx={{ fontWeight: 500, color: "var(--lr-text-secondary)" }}> (continued)</Box>}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: "var(--lr-text-secondary)", mb: "12px" }}>
                            {total > rows.length ? `The first ${formatCount(rows.length)} of ${formatCount(total)}, in the table's order` : `${formatCount(total)} in all, in the table's order`}
                        </Typography>
                        {chunk.length === 0 ? (
                            <Typography sx={{ fontSize: 13, color: "var(--lr-text-secondary)" }}>Nothing to list for this range.</Typography>
                        ) : group === "recruits" ? (
                            <Table columns={recruitColumns} rows={chunk as RecruitRow[]} start={i * ROWS_PER_PAGE} />
                        ) : (
                            <Table columns={groupColumns(group, columnTitle)} rows={chunk as ProgressRow[]} start={i * ROWS_PER_PAGE} />
                        )}
                    </Page>
                ))}
        </Box>
    );
}
