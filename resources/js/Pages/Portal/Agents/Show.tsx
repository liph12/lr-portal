import { ReactNode, useState } from "react";
import { Box, Container, Grid, LinearProgress, Typography } from "@mui/material";
import { ArrowBackRounded } from "@mui/icons-material";
import { router } from "@inertiajs/react";
import AppLayout from "../../../components/layouts/AppLayout";
import SectionCard from "../../../components/cards/SectionCard";
import StyledButton from "../../../components/utils/StyledButton";
import StatusChip from "../../../components/utils/StatusChip";
import CountryFlag from "../../../components/utils/CountryFlag";
import DateRangeField from "../../../components/utils/DateRangeField";
import UserAvatar from "../../../components/utils/user/UserAvatar";
import ReportStatistics, { ReportSummary } from "../../../components/reports/ReportStatistics";
import { reportPresets } from "../../../helpers/dateRanges";
import { formatDate } from "../../../helpers/formatDate";
import { AGENT_TYPE_LABELS } from "../../../types/app-data-types";

interface Membership {
    id: number;
    name: string;
    joined_at: string | null;
    transferred_at: string | null;
    status: string;
}

interface AgentProfileProps {
    agent: {
        id: number;
        name: string;
        avatar: string | null;
        email: string | null;
        mobile: string | null;
        status: string | null;
        role: string | null;
        agent_type: string;
        area: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        country_code: string | null;
    };
    teams: Membership[];
    subTeams: Membership[];
    filters: { from: string; to: string };
    summary: ReportSummary;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
    return (
        <Box>
            <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                {label}
            </Typography>
            <Typography variant="body2" component="div" sx={{ color: "var(--lr-text-primary)" }}>
                {children || "—"}
            </Typography>
        </Box>
    );
}

function History({ title, rows }: { title: string; rows: Membership[] }) {
    return (
        <SectionCard title={title}>
            {rows.length === 0 ? (
                <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                    None on record.
                </Typography>
            ) : (
                <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1.25 }}>
                    {rows.map((m, i) => (
                        <Box component="li" key={`${m.id}-${i}`} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" sx={{ fontWeight: 500, color: "var(--lr-text-primary)" }}>
                                    {m.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                                    {m.joined_at ? formatDate(m.joined_at) : "Unknown start"} – {m.transferred_at ? formatDate(m.transferred_at) : m.status === "active" ? "now" : "ended"}
                                </Typography>
                            </Box>
                            <StatusChip status={m.status === "active" ? "active" : "inactive"}>{m.status === "active" ? "Current" : "Past"}</StatusChip>
                        </Box>
                    ))}
                </Box>
            )}
        </SectionCard>
    );
}

// A read-only agent profile opened from the reports: who they are, where they belong, and their sales.
function AgentProfile({ agent, teams, subTeams, filters, summary }: AgentProfileProps) {
    const [loading, setLoading] = useState(false);
    const location = [agent.city, agent.state].filter(Boolean).join(", ");

    const changeRange = (range: { from: string; to: string }) =>
        router.get(`/agents/${agent.id}`, range, {
            only: ["filters", "summary"],
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 3, sm: 4 } }}>
            <StyledButton size="small" variant="text" startIcon={<ArrowBackRounded />} onClick={() => window.history.back()} sx={{ mb: 2, px: 1, color: "var(--lr-primary)" }}>
                Back
            </StyledButton>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, flexWrap: "wrap", mb: 3 }}>
                <UserAvatar name={agent.name} src={agent.avatar} size={80} />
                <Box sx={{ flex: 1, minWidth: 220 }}>
                    <Typography sx={{ fontSize: { xs: 22, sm: 26 }, color: "var(--lr-text-primary)" }}>{agent.name}</Typography>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap", mt: 0.5 }}>
                        {agent.role && (
                            <Typography variant="body2" sx={{ color: "var(--lr-primary)", fontWeight: 500 }}>
                                {agent.role}
                            </Typography>
                        )}
                        <StatusChip status={agent.agent_type}>{AGENT_TYPE_LABELS[agent.agent_type] ?? agent.agent_type}</StatusChip>
                        {agent.status && <StatusChip status={agent.status} />}
                        <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                            Agent #{agent.id}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <SectionCard title="Where they belong">
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                            <Fact label="Area">{agent.area ?? "Unassigned"}</Fact>
                            <Fact label="Location">{location}</Fact>
                            <Fact label="Country">
                                <CountryFlag code={agent.country_code} country={agent.country} />
                            </Fact>
                            <Fact label="Email">{agent.email}</Fact>
                            <Fact label="Mobile">{agent.mobile}</Fact>
                        </Box>
                    </SectionCard>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <History title="Teams" rows={teams} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <History title="Sub-teams" rows={subTeams} />
                </Grid>
            </Grid>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
                <Typography variant="h6" sx={{ fontSize: 18, color: "var(--lr-text-primary)", flex: 1 }}>
                    Sales
                </Typography>
                <DateRangeField value={filters} presets={reportPresets()} onChange={changeRange} />
            </Box>
            {loading && <LinearProgress sx={{ height: 2, mb: 2 }} />}
            <ReportStatistics summary={summary} showAreas={false} showAgentsTile={false} />
        </Container>
    );
}

AgentProfile.layout = (page: ReactNode) => <AppLayout children={page} />;

export default AgentProfile;
