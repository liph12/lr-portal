import { ReactNode } from "react";
import { Box, LinearProgress, Typography } from "@mui/material";
import { ArrowBackRounded, EmojiEventsRounded } from "@mui/icons-material";
import { Link } from "@inertiajs/react";
import AppLayout from "../../../components/layouts/AppLayout";
import StyledButton from "../../../components/utils/StyledButton";
import AgentSalesView, { AgentSalesProps } from "../../../components/sales/AgentSalesView";
import NatconPeriod, { NatconBoardPeriod, NatconSettings } from "../../../components/natcon/NatconPeriod";
import { formatPeso } from "../../../helpers/formatNumber";

interface MyNatconSalesProps extends AgentSalesProps {
    settings: NatconSettings;
    period: NatconBoardPeriod;
}

// How far the reader's NATCON sales are towards the qualifier amount.
function QualifierProgress({ total, target }: { total: number; target: number }) {
    const pct = target > 0 ? Math.min(100, (total / target) * 100) : 0;
    const qualified = total >= target;

    return (
        <Box sx={{ p: 2, mb: 3, borderRadius: 3, border: "1px solid var(--lr-border)", backgroundColor: qualified ? "var(--lr-success-soft)" : "var(--lr-surface)" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
                <EmojiEventsRounded sx={{ color: qualified ? "var(--lr-success)" : "var(--lr-primary)" }} aria-hidden />
                <Typography sx={{ fontWeight: 500, color: "var(--lr-text-primary)", flex: 1, minWidth: 200 }}>
                    {qualified ? "You qualified for NATCON" : `${formatPeso(target - total)} more to qualify`}
                </Typography>
                <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                    {formatPeso(total)} of {formatPeso(target)}
                </Typography>
            </Box>
            <LinearProgress
                variant="determinate"
                value={pct}
                aria-label={`NATCON qualifier: ${Math.round(pct)}%`}
                sx={{ height: 8, borderRadius: 99, backgroundColor: "var(--lr-surface-container)", "& .MuiLinearProgress-bar": { borderRadius: 99, backgroundColor: qualified ? "var(--lr-success)" : "var(--lr-primary)" } }}
            />
        </Box>
    );
}

// My NATCON Sales: the reader's own sales that count for NATCON — valid, reserved in the period and encoded by its cutoff
// (every category, the Qualifiers rule) — shown like My Sales; the period and status are fixed.
function MyNatconSales({ settings, period, ...props }: MyNatconSalesProps) {
    // The totals cover every category whatever is picked: the qualifier counts them all.
    const total = props.totals.reduce((sum, t) => sum + t.value, 0);

    return (
        <AgentSalesView
            {...props}
            fixedPeriod
            basePath="/natcon/my-sales"
            title="My NATCON Sales"
            subtitle="Your own valid sales that count for NATCON, client by client. Click a sale for its details and files."
            top={
                <Link href="/natcon" style={{ textDecoration: "none" }}>
                    <StyledButton size="small" variant="text" startIcon={<ArrowBackRounded />} sx={{ mb: 1, px: 1, color: "var(--lr-primary)" }}>
                        NATCON
                    </StyledButton>
                </Link>
            }
            header={
                <>
                    <NatconPeriod period={period} qualifier={settings.qualifier_amount} />
                    <QualifierProgress total={total} target={settings.qualifier_amount} />
                </>
            }
        />
    );
}

MyNatconSales.layout = (page: ReactNode) => <AppLayout children={page} />;

export default MyNatconSales;
