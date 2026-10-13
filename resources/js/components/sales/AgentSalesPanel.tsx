import { ReactNode, useState } from "react";
import { Box, ButtonBase, Collapse, Drawer, FormControlLabel, IconButton, Switch, Typography } from "@mui/material";
import { CloseRounded, ExpandLessRounded, ExpandMoreRounded } from "@mui/icons-material";
import { Link } from "@inertiajs/react";
import StatusMenu from "../utils/StatusMenu";
import StatusChip from "../utils/StatusChip";
import UserAvatar from "../utils/user/UserAvatar";
import FileLink from "./FileLink";
import { SaleDetail } from "./SaleDetailsForm";
import { formatDate } from "../../helpers/formatDate";
import { formatCount, formatPeso } from "../../helpers/formatNumber";
import { SaleCategory } from "../../types/app-data-types";
import { SALE_STATUS_CONFIRM, SALE_STATUS_ICONS, SALE_STATUS_SAFE } from "./saleStatusConfirm";

type Category = SaleCategory;

interface PanelSale {
    id: number;
    unit_number: string | null;
    sale_status: string;
    created_at: string | null;
    reservation_date: string | null;
    value: number;
    client_first_name: string | null;
    client_last_name: string | null;
    client_mobile: string | null;
    client_email: string | null;
    project_name?: string | null;
    developer_id?: number | null;
    developer?: string | null;
    brokerage_area_id?: number | null;
    proof_of_transaction?: string | null;
    brokerage_area?: string | null;
    closing_agent?: string | null;
    partner_agent?: string | null;
    remittance_slip?: string | null;
    deposit_slip?: string | null;
}

export interface AgentSales {
    agent: { id: number; name: string | null; email: string | null; avatar: string | null; area: string };
    all_dates: boolean;
    limit: number;
    categories: Record<Category, { total: number; counts: Record<string, number>; rows: PanelSale[] }>;
}

interface AgentSalesPanelProps {
    data: AgentSales | null;
    statuses: string[];
    statusLabels: Record<string, string>;
    baseUrl: string;
    rangeLabel: string;
    onClose: () => void;
    onAllDates: (all: boolean) => void;
    // The sale expanded in place (its full details, editable), and how to open / close one.
    expanded: SaleDetail | null;
    onToggleSale: (saleId: number) => void;
    renderSale: (detail: SaleDetail) => ReactNode;
}

const TITLES: Record<Category, string> = { project: "Project", brokerage: "Brokerage", rental: "Rental" };

// One agent's sales, client first, in Project / Brokerage / Rental tabs; statuses can be changed from here too.
export default function AgentSalesPanel(props: AgentSalesPanelProps) {
    const { data, onClose } = props;
    return (
        <Drawer anchor="right" open={data !== null} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: "100%", sm: 560 }, backgroundColor: "var(--lr-surface)" } } }}>
            {data && <PanelBody key={data.agent.id} {...props} data={data} />}
        </Drawer>
    );
}

function PanelBody({ data, statuses, statusLabels, baseUrl, rangeLabel, onClose, onAllDates, expanded, onToggleSale, renderSale }: AgentSalesPanelProps & { data: AgentSales }) {
    const categories = Object.keys(data.categories) as Category[];
    const [tab, setTab] = useState<Category>(categories.find((c) => data.categories[c].total > 0) ?? "project");
    const current = data.categories[tab];

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <UserAvatar name={data.agent.name ?? "?"} src={data.agent.avatar} size={44} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/agents/${data.agent.id}`} style={{ textDecoration: "none" }}>
                        <Typography noWrap sx={{ fontWeight: 500, color: "var(--lr-primary)" }}>
                            {data.agent.name ?? `Agent #${data.agent.id}`}
                        </Typography>
                    </Link>
                    <Typography variant="caption" noWrap component="div" sx={{ color: "var(--lr-text-secondary)" }}>
                        {[data.agent.area, data.agent.email].filter(Boolean).join(" · ")}
                    </Typography>
                </Box>
                <IconButton aria-label="Close" onClick={onClose}>
                    <CloseRounded />
                </IconButton>
            </Box>

            <FormControlLabel
                control={<Switch size="small" checked={data.all_dates} onChange={(e) => onAllDates(e.target.checked)} />}
                label={<Typography variant="body2">{data.all_dates ? "All dates" : `All dates (now: ${rangeLabel})`}</Typography>}
            />

            <Box role="tablist" aria-label="Sale type" sx={{ display: "flex", gap: 1 }}>
                {categories.map((c) => {
                    const active = tab === c;
                    return (
                        <ButtonBase
                            key={c}
                            role="tab"
                            aria-selected={active}
                            onClick={() => setTab(c)}
                            sx={{
                                px: 2,
                                py: 0.75,
                                borderRadius: 99,
                                fontSize: 14,
                                fontWeight: active ? 600 : 500,
                                color: active ? "var(--lr-primary)" : "var(--lr-text-body)",
                                backgroundColor: active ? "var(--lr-primary-soft)" : "var(--lr-surface-container)",
                            }}
                        >
                            {TITLES[c]}
                            <Box component="span" sx={{ ml: 1, color: "var(--lr-text-secondary)" }}>
                                {formatCount(data.categories[c].total)}
                            </Box>
                        </ButtonBase>
                    );
                })}
            </Box>

            {current.total > 0 && (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                    {statuses.map((s) => (
                        <StatusChip key={s} status={s}>
                            {statusLabels[s]}
                            <Box component="span" sx={{ ml: 0.75, fontFamily: "Google Sans Code, monospace", fontWeight: 600 }}>
                                {formatCount(current.counts[s] ?? 0)}
                            </Box>
                        </StatusChip>
                    ))}
                </Box>
            )}

            {current.rows.length === 0 ? (
                <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", py: 3, textAlign: "center" }}>
                    No {TITLES[tab].toLowerCase()} sales {data.all_dates ? "yet" : "in this range"}.
                </Typography>
            ) : (
                <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                    {current.rows.map((r) => (
                        <Box component="li" key={r.id} sx={{ border: "1px solid var(--lr-border)", borderRadius: 3, p: 1.5, borderColor: expanded?.id === r.id ? "var(--lr-primary)" : "var(--lr-border)" }}>
                            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                                <IconButton
                                    size="small"
                                    aria-expanded={expanded?.id === r.id}
                                    aria-label={expanded?.id === r.id ? "Hide the sale details" : "Show and edit the sale details"}
                                    onClick={() => onToggleSale(r.id)}
                                    sx={{ mt: -0.25 }}
                                >
                                    {expanded?.id === r.id ? <ExpandLessRounded fontSize="small" /> : <ExpandMoreRounded fontSize="small" />}
                                </IconButton>
                                <Box sx={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => onToggleSale(r.id)}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--lr-text-primary)" }}>
                                        {[r.client_first_name, r.client_last_name].filter(Boolean).join(" ") || "No client name"}
                                    </Typography>
                                    <Typography variant="caption" component="div" sx={{ color: "var(--lr-text-secondary)" }}>
                                        {[r.client_mobile, r.client_email].filter(Boolean).join(" · ") || "No contact details"}
                                    </Typography>
                                </Box>
                                <StatusMenu status={r.sale_status} statuses={statuses} labels={statusLabels} url={`${baseUrl}/${r.id}`} subject={`this ${TITLES[tab].toLowerCase()} sale`} confirm={SALE_STATUS_CONFIRM} safe={SALE_STATUS_SAFE} icons={SALE_STATUS_ICONS} />

                            </Box>
                            <Typography variant="body2" sx={{ color: "var(--lr-text-body)", mt: 1 }}>
                                {tab === "project"
                                    ? [r.project_name, r.developer].filter(Boolean).join(" · ")
                                    : tab === "brokerage"
                                      ? r.brokerage_area
                                      : [r.closing_agent && `Closing: ${r.closing_agent}`, r.partner_agent && `Partner: ${r.partner_agent}`].filter(Boolean).join(" · ")}
                                {r.unit_number && ` · Unit ${r.unit_number}`}
                            </Typography>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mt: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 500, color: "var(--lr-text-primary)", fontFamily: "Google Sans Code, monospace" }}>
                                    {formatPeso(r.value)}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)", flex: 1 }}>
                                    Reserved {r.reservation_date ? formatDate(r.reservation_date) : "—"} · added {r.created_at ? formatDate(r.created_at) : "—"}
                                </Typography>
                                {tab === "project" ? (
                                    <FileLink url={r.proof_of_transaction ?? null} label="Proof" />
                                ) : (
                                    <>
                                        <FileLink url={r.remittance_slip ?? null} label="Remittance" />
                                        <FileLink url={r.deposit_slip ?? null} label="Deposit" />
                                    </>
                                )}
                            </Box>
                            <Collapse in={expanded?.id === r.id} unmountOnExit>
                                <Box sx={{ borderTop: "1px solid var(--lr-border)", mt: 1.5, pt: 2 }}>{expanded?.id === r.id && renderSale(expanded)}</Box>
                            </Collapse>
                        </Box>
                    ))}
                </Box>
            )}
            {current.total > current.rows.length && (
                <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)", textAlign: "center" }}>
                    Showing the newest {formatCount(current.rows.length)} of {formatCount(current.total)}.
                </Typography>
            )}
        </Box>
    );
}
