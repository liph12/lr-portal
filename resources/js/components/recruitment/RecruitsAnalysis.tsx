import { ReactNode, useState } from "react";
import { Box, FormControlLabel, LinearProgress, Radio, RadioGroup, Tooltip, Typography } from "@mui/material";
import {
    AutoAwesomeRounded,
    CheckCircleRounded,
    ErrorOutlineRounded,
    GroupsRounded,
    PersonAddAlt1Rounded,
    SendRounded,
    VisibilityRounded,
    WarningAmberRounded,
} from "@mui/icons-material";
import StatTile from "../charts/StatTile";
import { srOnly } from "../charts/srOnly";
import StyledButton from "../utils/StyledButton";
import ConfirmDialog from "../utils/ConfirmDialog";
import { formatCount, formatMonth, formatPeso, formatPesoCompact, formatPesoExact } from "../../helpers/formatNumber";
import { formatDate, formatDateTime } from "../../helpers/formatDate";

export interface AnalysisGroup {
    type: "team" | "sub_team";
    id: number;
}

interface Side {
    value: number;
    share_pct: number;
    sales: number;
    sellers: number;
    agents: number;
    productivity_pct: number;
    per_seller: number;
}

export interface RecruitsAnalysisData {
    group: AnalysisGroup;
    model: string;
    error: string | null;
    facts: {
        range: { from: string; to: string };
        members: { total: number; new: number; old: number };
        contribution: { total: number; sales: number; old: Side; new: Side };
        monthly: { month: string; sales: number; value: number; new_value: number }[];
        forecast: { month: string; value: number; low: number; high: number }[];
        double: { baseline_monthly: number; target_monthly: number; target_quarter: number };
        // The last 3 months: sellers a month, their value each, and how many sellers the target needs at that value.
        capacity: { sellers_per_month: number; value_per_seller_month: number; sellers_needed: number | null };
    };
    ai: {
        summary: string;
        highlights: { text: string; verdict: "good" | "watch" | "risk" }[];
        contribution: string;
        training: string;
        outlook: { month: string; expectation: string; focus: string; actions: string[] }[];
        strategies: { title: string; detail: string; owner: string; kpi: string; impact: "high" | "medium" | "low" }[];
        generated_at: string;
    } | null;
}

interface RecruitsAnalysisProps {
    // The team / sub-team on the page, by name ("Filipinohomes VIP").
    name: string;
    kind: "team" | "sub-team";
    analysis: RecruitsAnalysisData | null;
    loading?: boolean;
    onAnalyze?: () => void;
    // The PDF: no frame, buttons or warnings, fixed columns (the page is A4, whatever the screen), only these parts.
    print?: boolean;
    parts?: Part[];
    // "Send report" (superadmin): the leader (null without an email) and how many superadmins; null when the reader can't send.
    audience?: SendAudience | null;
    sending?: boolean;
    onSend?: (to: SendTo) => void;
}

export interface SendAudience {
    leader: { name: string; email: string; role: string } | null;
    superadmins: number;
}

export type SendTo = "superadmins" | "all";

export type Part = "summary" | "contribution" | "outlook" | "training" | "strategies" | "note";

const ALL_PARTS: Part[] = ["summary", "contribution", "outlook", "training", "strategies", "note"];

const VERDICTS = {
    good: { icon: CheckCircleRounded, color: "var(--lr-success-icon)", label: "Good" },
    watch: { icon: VisibilityRounded, color: "var(--lr-warning)", label: "Watch" },
    risk: { icon: ErrorOutlineRounded, color: "var(--lr-error)", label: "Risk" },
};

const IMPACT = {
    high: { color: "var(--lr-primary)", background: "var(--lr-primary-soft)" },
    medium: { color: "var(--lr-text-body)", background: "var(--lr-surface-container)" },
    low: { color: "var(--lr-text-secondary)", background: "var(--lr-surface-container)" },
};

function Block({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
    return (
        <Box component="section" sx={{ mt: 3 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: "var(--lr-text-primary)" }}>{title}</Typography>
            {subtitle && (
                <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", mb: 1.5 }}>
                    {subtitle}
                </Typography>
            )}
            {children}
        </Box>
    );
}

function Paragraph({ children }: { children: ReactNode }) {
    return <Typography sx={{ fontSize: 14, lineHeight: 1.65, color: "var(--lr-text-body)", mt: 1.5 }}>{children}</Typography>;
}

// Old and new agents' sales per month, stacked, then the three forecast months (outlined) against the doubling target (dashed).
function TrendChart({ monthly, forecast, target }: { monthly: RecruitsAnalysisData["facts"]["monthly"]; forecast: RecruitsAnalysisData["facts"]["forecast"]; target: number }) {
    const max = Math.max(target, ...monthly.map((m) => m.value), ...forecast.map((f) => f.high), 1);
    const height = 180;
    const h = (v: number) => `${(v / max) * 100}%`;

    return (
        <Box component="figure" sx={{ m: 0 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 1.5, fontSize: 12, color: "var(--lr-text-secondary)" }}>
                {[
                    ["var(--lr-series-1)", "Old agents"],
                    ["var(--lr-series-2)", "New agents"],
                ].map(([color, label]) => (
                    <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: 0.5, backgroundColor: color }} />
                        {label}
                    </Box>
                ))}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: 0.5, border: "2px dashed var(--lr-primary)" }} />
                    Forecast
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <Box sx={{ width: 16, borderTop: "2px dashed var(--lr-accent)" }} />
                    Target to double ({formatPesoCompact(target)} a month)
                </Box>
            </Box>
            <Box aria-hidden sx={{ position: "relative", height, display: "flex", alignItems: "flex-end", gap: "4px", borderBottom: "1px solid var(--lr-chart-grid)" }}>
                <Box sx={{ position: "absolute", left: 0, right: 0, bottom: h(target), borderTop: "2px dashed var(--lr-accent)", zIndex: 1 }} />
                {monthly.map((m) => (
                    <Tooltip key={m.month} title={`${formatMonth(m.month, "long")}: ${formatPeso(m.value)} — old agents ${formatPeso(m.value - m.new_value)}, new agents ${formatPeso(m.new_value)}`}>
                        <Box sx={{ flex: 1, height: h(m.value), display: "flex", flexDirection: "column", gap: m.new_value > 0 && m.value > m.new_value ? "2px" : 0, minHeight: 2 }}>
                            {m.new_value > 0 && <Box sx={{ flex: m.new_value, backgroundColor: "var(--lr-series-2)", borderRadius: "4px 4px 0 0" }} />}
                            <Box sx={{ flex: m.value - m.new_value, backgroundColor: "var(--lr-series-1)", borderRadius: m.new_value > 0 ? 0 : "4px 4px 0 0" }} />
                        </Box>
                    </Tooltip>
                ))}
                {forecast.map((f) => (
                    <Tooltip key={f.month} title={`${formatMonth(f.month, "long")} (forecast): about ${formatPeso(f.value)}, likely ${formatPeso(f.low)} – ${formatPeso(f.high)}`}>
                        <Box sx={{ flex: 1, height: h(f.value), border: "2px dashed var(--lr-primary)", borderBottom: 0, borderRadius: "4px 4px 0 0", backgroundColor: "var(--lr-primary-soft)", minHeight: 2 }} />
                    </Tooltip>
                ))}
            </Box>
            <Box aria-hidden sx={{ display: "flex", gap: "4px", mt: 0.5 }}>
                {[...monthly.map((m) => m.month), ...forecast.map((f) => f.month)].map((month, i) => (
                    <Typography key={month} sx={{ flex: 1, textAlign: "center", fontSize: 10.5, color: i >= monthly.length ? "var(--lr-primary)" : "var(--lr-text-secondary)", fontWeight: i >= monthly.length ? 700 : 400 }}>
                        {formatMonth(month)}
                    </Typography>
                ))}
            </Box>
            <Box component="table" sx={srOnly}>
                <caption>Sales per month by old and new agents, then the forecast</caption>
                <tbody>
                    {monthly.map((m) => (
                        <tr key={m.month}>
                            <th scope="row">{formatMonth(m.month, "long")}</th>
                            <td>{formatPeso(m.value - m.new_value)} old agents</td>
                            <td>{formatPeso(m.new_value)} new agents</td>
                        </tr>
                    ))}
                    {forecast.map((f) => (
                        <tr key={f.month}>
                            <th scope="row">{formatMonth(f.month, "long")} forecast</th>
                            <td>{formatPeso(f.value)}</td>
                            <td>
                                {formatPeso(f.low)} – {formatPeso(f.high)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Box>
        </Box>
    );
}

// Recruits Progress › AI analysis of the team / sub-team in view: exact numbers (contribution of old vs new agents, a three-month
// forecast, the target that doubles sales) and, written by AI from those totals, the reading, the next three months and ten
// strategies to double the group's sales.
export default function RecruitsAnalysis({ name, kind, analysis, loading = false, onAnalyze, print = false, parts = ALL_PARTS, audience = null, sending = false, onSend }: RecruitsAnalysisProps) {
    const [confirming, setConfirming] = useState(false);
    const [sendTo, setSendTo] = useState<SendTo>("superadmins");
    const facts = analysis?.facts;
    const ai = analysis?.ai ?? null;
    // In forecast order (the model is told to keep it; its month labels are written for reading, not matching).
    const outlook = (i: number) => ai?.outlook[i];
    const show = (part: Part) => parts.includes(part);
    const columns = (n: number) => ({ display: "grid", gap: 2, gridTemplateColumns: print ? `repeat(${n}, 1fr)` : { xs: "1fr", md: `repeat(${n}, 1fr)` } });

    const content = facts && (
        <>
            {ai && show("summary") && (
                <Block title="Summary">
                    <Paragraph>{ai.summary}</Paragraph>
                    <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0, mt: 1.5, display: "grid", gap: 1 }}>
                        {ai.highlights.map((h, i) => {
                            const v = VERDICTS[h.verdict];
                            return (
                                <Box component="li" key={i} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                                    <v.icon sx={{ fontSize: 20, color: v.color, mt: "1px" }} aria-label={v.label} />
                                    <Typography sx={{ fontSize: 14, color: "var(--lr-text-body)" }}>{h.text}</Typography>
                                </Box>
                            );
                        })}
                    </Box>
                </Block>
            )}

            {show("contribution") && (
                <Block title="Contribution KPI: old vs new agents" subtitle={`Valid sales reserved ${formatDate(facts.range.from)} – ${formatDate(facts.range.to)}; new agents = members who signed up in that range.`}>
                    <Box sx={columns(2)}>
                        {(
                            [
                                ["Old agents", facts.contribution.old, GroupsRounded],
                                ["New agents", facts.contribution.new, PersonAddAlt1Rounded],
                            ] as const
                        ).map(([label, side, icon]) => (
                            <StatTile
                                key={label}
                                icon={icon}
                                label={`${label} · ${side.share_pct}% of sales`}
                                value={formatPesoExact(side.value)}
                                caption={`${formatCount(side.sellers)} of ${formatCount(side.agents)} sold (${side.productivity_pct}%) · ${formatPeso(side.per_seller)} per seller · ${formatCount(side.sales)} sales`}
                            />
                        ))}
                    </Box>
                    {facts.contribution.total > 0 && (
                        <Box component="figure" sx={{ m: 0, mt: 2 }}>
                            <Box aria-hidden sx={{ display: "flex", gap: "2px", height: 14, borderRadius: 99, overflow: "hidden", backgroundColor: "var(--lr-surface-container)" }}>
                                <Box sx={{ width: `${facts.contribution.old.share_pct}%`, backgroundColor: "var(--lr-series-1)" }} />
                                <Box sx={{ width: `${facts.contribution.new.share_pct}%`, backgroundColor: "var(--lr-series-2)" }} />
                            </Box>
                            <Box component="figcaption" sx={{ display: "flex", flexWrap: "wrap", gap: 3, mt: 1, fontSize: 13, color: "var(--lr-text-body)" }}>
                                {(
                                    [
                                        ["var(--lr-series-1)", "Old agents", facts.contribution.old],
                                        ["var(--lr-series-2)", "New agents", facts.contribution.new],
                                    ] as const
                                ).map(([color, label, side]) => (
                                    <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                                        <Box sx={{ width: 10, height: 10, borderRadius: 0.5, backgroundColor: color }} />
                                        {label}: <b>{side.share_pct}%</b> ({formatPeso(side.value)})
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    )}
                    {ai && <Paragraph>{ai.contribution}</Paragraph>}
                </Block>
            )}

            {show("outlook") && (
                <Block
                    title="The next 3 months"
                    subtitle={`Forecast from the last 12 whole months. To double: from ${formatPeso(facts.double.baseline_monthly)} a month (the last 3 months' average) to ${formatPeso(facts.double.target_monthly)}.`}
                >
                    {facts.capacity.sellers_needed !== null && (
                        <Typography sx={{ fontSize: 13.5, color: "var(--lr-text-body)", mb: 1.5 }}>
                            In the last 3 months <b>{formatCount(Math.round(facts.capacity.sellers_per_month))} agents sold a month</b>, at {formatPeso(facts.capacity.value_per_seller_month)} each.
                            At that rate the target needs <b>about {formatCount(facts.capacity.sellers_needed)} sellers a month</b>.
                        </Typography>
                    )}
                    <TrendChart monthly={facts.monthly} forecast={facts.forecast} target={facts.double.target_monthly} />
                    <Box sx={{ ...columns(3), mt: 2 }}>
                        {facts.forecast.map((f, i) => {
                            const o = outlook(i);
                            return (
                                <Box key={f.month} sx={{ border: "1px solid var(--lr-border)", borderRadius: 2.5, p: 2, backgroundColor: "var(--lr-surface-dim)" }}>
                                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: "var(--lr-primary)" }}>{formatMonth(f.month, "long")}</Typography>
                                    <Typography sx={{ fontSize: 22, fontWeight: 700, color: "var(--lr-text-primary)", whiteSpace: "nowrap" }}>{formatPeso(f.value)}</Typography>
                                    <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                                        likely {formatPeso(f.low)} – {formatPeso(f.high)} · target {formatPeso(facts.double.target_monthly)}
                                    </Typography>
                                    {o && (
                                        <>
                                            <Typography sx={{ fontSize: 13.5, color: "var(--lr-text-body)", mt: 1.25 }}>{o.expectation}</Typography>
                                            <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: "var(--lr-text-primary)", mt: 1 }}>Focus: {o.focus}</Typography>
                                            <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5, fontSize: 13.5, color: "var(--lr-text-body)", "& li": { mt: 0.5 } }}>
                                                {o.actions.map((a, i) => (
                                                    <li key={i}>{a}</li>
                                                ))}
                                            </Box>
                                        </>
                                    )}
                                </Box>
                            );
                        })}
                    </Box>
                </Block>
            )}

            {ai && show("training") && (
                <Block title="NAO & FIRE">
                    <Paragraph>{ai.training}</Paragraph>
                </Block>
            )}

            {ai && show("strategies") && (
                <Block title={`10 strategies to double the ${kind}'s sales`} subtitle={`From ${formatPeso(facts.double.baseline_monthly)} to ${formatPeso(facts.double.target_monthly)} a month, ranked by expected impact.`}>
                    <Box sx={columns(2)}>
                        {ai.strategies.map((s, i) => (
                            <Box key={i} sx={{ display: "flex", gap: 1.5, border: "1px solid var(--lr-border)", borderRadius: 2.5, p: print ? 1.5 : 2, backgroundColor: "var(--lr-surface)" }}>
                                <Box sx={{ width: 30, height: 30, borderRadius: 99, flexShrink: 0, display: "grid", placeItems: "center", fontWeight: 700, fontSize: 14, color: "var(--lr-on-primary)", backgroundColor: "var(--lr-primary)" }}>
                                    {i + 1}
                                </Box>
                                <Box sx={{ minWidth: 0 }}>
                                    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
                                        <Typography sx={{ fontSize: print ? 14 : 15, fontWeight: 700, color: "var(--lr-text-primary)" }}>{s.title}</Typography>
                                        <Box component="span" sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, px: 1, py: 0.25, borderRadius: 99, ...IMPACT[s.impact] }}>
                                            {s.impact} impact
                                        </Box>
                                    </Box>
                                    <Typography sx={{ fontSize: print ? 12.5 : 13.5, color: "var(--lr-text-body)", mt: 0.75, lineHeight: print ? 1.45 : 1.6 }}>{s.detail}</Typography>
                                    <Typography sx={{ fontSize: print ? 11.5 : 12.5, color: "var(--lr-text-secondary)", mt: 0.75 }}>
                                        <b>Owner:</b> {s.owner} · <b>KPI:</b> {s.kpi}
                                    </Typography>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                </Block>
            )}

            {ai && show("note") && (
                <Typography variant="caption" component="p" sx={{ color: "var(--lr-text-secondary)", mt: print ? 2 : 3 }}>
                    Written by AI ({analysis?.model}) from this {kind}'s totals on {formatDateTime(ai.generated_at)} — no names or personal details are sent. Check it before acting on it; the numbers are exact.
                </Typography>
            )}
        </>
    );

    if (print) {
        return <Box sx={{ "& > section:first-of-type": { mt: 0 } }}>{content}</Box>;
    }

    return (
        <Box
            component="section"
            aria-label="AI analysis"
            sx={{ mb: 4, border: "1px solid var(--lr-border)", borderRadius: 3, backgroundColor: "var(--lr-surface)", boxShadow: "var(--lr-shadow)", p: { xs: 2, sm: 3 } }}
        >
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 2, display: "grid", placeItems: "center", backgroundColor: "var(--lr-primary-soft)", color: "var(--lr-primary)", flexShrink: 0 }}>
                    <AutoAwesomeRounded />
                </Box>
                <Box sx={{ flex: 1, minWidth: 220 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 700, color: "var(--lr-text-primary)" }}>AI analysis · {name}</Typography>
                    <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                        Old vs new agents' contribution, NAO / FIRE, what to expect in the next 3 months and 10 strategies to double the {kind}'s sales.
                    </Typography>
                </Box>
                {!analysis && (
                    <StyledButton variant="contained" startIcon={<AutoAwesomeRounded />} onClick={onAnalyze} disabled={loading} sx={{ px: 2.5, borderRadius: 99 }}>
                        {loading ? "Analyzing…" : `Analyze this ${kind}`}
                    </StyledButton>
                )}
                {ai && audience && onSend && (
                    <StyledButton variant="contained" startIcon={<SendRounded />} onClick={() => setConfirming(true)} disabled={sending} sx={{ px: 2.5, borderRadius: 99 }}>
                        {sending ? "Sending…" : "Send report"}
                    </StyledButton>
                )}
            </Box>

            {loading && (
                <Box sx={{ mt: 2.5 }}>
                    <LinearProgress sx={{ height: 3, borderRadius: 99 }} />
                    <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", mt: 1 }}>
                        Reading the {kind}'s numbers and writing the analysis — usually 10–30 seconds.
                    </Typography>
                </Box>
            )}

            {analysis?.error && (
                <Box role="status" sx={{ mt: 2.5, display: "flex", gap: 1.5, alignItems: "flex-start", p: 1.5, borderRadius: 2, backgroundColor: "var(--lr-warning-soft)", color: "var(--lr-text-body)" }}>
                    <WarningAmberRounded sx={{ color: "var(--lr-warning)" }} />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                        {analysis.error}
                    </Typography>
                    {!loading && onAnalyze && (
                        <StyledButton size="small" onClick={onAnalyze} sx={{ color: "var(--lr-primary)" }}>
                            Try again
                        </StyledButton>
                    )}
                </Box>
            )}

            {content}

            {audience && onSend && (
                <ConfirmDialog
                    open={confirming}
                    tone="primary"
                    title="Send this report"
                    message={
                        <>
                            <Typography variant="body2" sx={{ color: "var(--lr-text-body)", mb: 1.5 }}>
                                Email the analysis of <b>{name}</b>. The whole analysis is in the email itself.
                            </Typography>
                            <RadioGroup value={sendTo} onChange={(e) => setSendTo(e.target.value as SendTo)} aria-label="Send to">
                                {(
                                    [
                                        ["superadmins", "Superadmins only", `${formatCount(audience.superadmins)} superadmin${audience.superadmins === 1 ? "" : "s"}; the leader doesn't receive it.`],
                                        [
                                            "all",
                                            `${audience.leader?.role ?? (kind === "team" ? "Team leader" : "Unit manager")} and superadmins`,
                                            audience.leader
                                                ? `${audience.leader.name} (${audience.leader.email}), with the superadmins copied.`
                                                : "The leader has no email address on file.",
                                        ],
                                    ] as const
                                ).map(([value, label, hint]) => (
                                    <FormControlLabel
                                        key={value}
                                        value={value}
                                        disabled={value === "all" && !audience.leader}
                                        control={<Radio size="small" sx={{ color: "var(--lr-text-secondary)", "&.Mui-checked": { color: "var(--lr-primary)" } }} />}
                                        sx={{ alignItems: "flex-start", mb: 1, "& .MuiFormControlLabel-label": { pt: "7px" } }}
                                        label={
                                            <>
                                                <Typography sx={{ fontSize: 14, fontWeight: 600, color: "var(--lr-text-primary)" }}>{label}</Typography>
                                                <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                                                    {hint}
                                                </Typography>
                                            </>
                                        }
                                    />
                                ))}
                            </RadioGroup>
                        </>
                    }
                    confirmLabel="Send report"
                    onConfirm={() => {
                        setConfirming(false);
                        onSend(sendTo);
                    }}
                    onClose={() => setConfirming(false)}
                />
            )}
        </Box>
    );
}
