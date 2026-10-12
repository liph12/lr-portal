import { ReactNode, useState } from "react";
import { Box, Container, Grid, LinearProgress, Link as MuiLink, Typography } from "@mui/material";
import { ArrowBackRounded, LoginRounded } from "@mui/icons-material";
import ConfirmDialog from "../../../components/utils/ConfirmDialog";
import useAuthUser from "../../../hooks/useAuthUser";
import { Link, router } from "@inertiajs/react";
import AppLayout from "../../../components/layouts/AppLayout";
import SectionCard from "../../../components/cards/SectionCard";
import StyledButton from "../../../components/utils/StyledButton";
import StatusChip from "../../../components/utils/StatusChip";
import DesignationBadges from "../../../components/utils/user/DesignationBadges";
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
        user_id: number;
        name: string;
        avatar: string | null;
        email: string | null;
        mobile: string | null;
        status: string | null;
        role: string | null;
        agent_type: string;
        is_broker: boolean;
        broker_since: string | null;
        unit_manager_by: "rate" | "dashboard" | null;
        unit_manager_since: string | null;
        activity: string;
        area: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        country_code: string | null;
    };
    teams: Membership[];
    subTeams: Membership[];
    details: AgentDetails;
    // The upline; name / email are null when the sponsor wasn't imported, linkable when the reader may open them.
    sponsor: { id: number; name: string | null; email: string | null; avatar: string | null; area: string | null; linkable: boolean } | null;
    filters: { from: string; to: string };
    // Null for back-office readers without view_reports: the profile without the sales.
    summary: ReportSummary | null;
}

interface AgentDetails {
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    gender: string | null;
    marital_status: string | null;
    phone: string | null;
    address: string | null;
    signed_up: string | null;
    // Joined Leuterio Realty (legacy lr_joined); often before the portal sign-up.
    joined_lr: string | null;
    about: string | null;
    skills: string | null;
    work_experience: string | null;
    links: Record<string, string>;
    // null when hidden from this reader; tin_hidden then says one exists.
    tin: string | null;
    tin_hidden: boolean;
    prc_expiration: string | null;
    dhsud_expiration: string | null;
    referral_link: string | null;
    date_activated: string | null;
    nao: number;
    nao_attendance_status: string | null;
    nao_date_of_attendance: string | null;
    nao_proof_of_attendance: string | null;
    fire: number;
    direct_recruits: number;
}

function Bar({ value }: { value: number }) {
    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, maxWidth: 320 }}>
            <LinearProgress
                variant="determinate"
                value={value}
                aria-label={`${value}%`}
                sx={{ flex: 1, height: 6, borderRadius: 99, backgroundColor: "var(--lr-surface-container)", "& .MuiLinearProgress-bar": { borderRadius: 99, backgroundColor: value >= 100 ? "var(--lr-success-icon)" : "var(--lr-primary)" } }}
            />
            <Typography variant="caption" sx={{ width: 40, textAlign: "right" }}>
                {value}%
            </Typography>
        </Box>
    );
}

// An expiry date, flagged once it has passed.
function Expiry({ date }: { date: string | null }) {
    if (!date) return null;
    const expired = date.slice(0, 10) < new Date().toISOString().slice(0, 10);

    return (
        <>
            {formatDate(date)} {expired && <StatusChip status="terminated">Expired</StatusChip>}
        </>
    );
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
        <SectionCard fill title={title}>
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
function AgentProfile({ agent, teams, subTeams, details, sponsor, filters, summary }: AgentProfileProps) {
    const [loading, setLoading] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const me = useAuthUser();
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
                        <DesignationBadges person={agent} size="medium" showDates />
                        <StatusChip status={agent.agent_type}>{AGENT_TYPE_LABELS[agent.agent_type] ?? agent.agent_type}</StatusChip>
                        {agent.status && (
                            <StatusChip status={agent.status} title={agent.activity === "dormant" ? "Inactive: no sale in the last 6 months since activation" : undefined} />
                        )}
                        <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                            Agent #{agent.id}
                        </Typography>
                    </Box>
                </Box>
                {me?.can.impersonate && agent.status === "active" && agent.role !== "Superadmin" && (
                    <StyledButton
                        variant="outlined"
                        startIcon={<LoginRounded />}
                        onClick={() => setConfirming(true)}
                        sx={{ color: "var(--lr-primary)", borderColor: "var(--lr-outline)" }}
                    >
                        Sign in as {agent.name.split(" ")[0]}
                    </StyledButton>
                )}
            </Box>

            {/* Even rows of equal cards: six details in two rows of three, About across, then the team history. */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                    <SectionCard fill title="Upline / sponsor">
                        {sponsor ? (
                            <Box
                                onClick={sponsor.linkable ? () => router.visit(`/agents/${sponsor.id}`) : undefined}
                                sx={{ display: "flex", alignItems: "center", gap: 1.5, cursor: sponsor.linkable ? "pointer" : "default" }}
                            >
                                <UserAvatar name={sponsor.name ?? "?"} src={sponsor.avatar} size={48} />
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 500, color: sponsor.linkable ? "var(--lr-primary)" : "var(--lr-text-primary)" }}>
                                        {sponsor.name ?? "Not in the portal"}
                                    </Typography>
                                    <Typography variant="caption" component="div" sx={{ color: "var(--lr-text-secondary)", overflowWrap: "anywhere" }}>
                                        {sponsor.email ?? `Member #${sponsor.id}`}
                                    </Typography>
                                    {sponsor.area && (
                                        <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                                            {sponsor.area}
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                        ) : (
                            <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                                No sponsor on record.
                            </Typography>
                        )}
                        <Box sx={{ mt: 2 }}>
                            <Fact label="Direct recruits (agents they sponsored)">{details.direct_recruits.toLocaleString()}</Fact>
                        </Box>
                    </SectionCard>
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                    <SectionCard fill title="Contact & location">
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                            <Fact label="Email">{agent.email}</Fact>
                            <Fact label="Mobile">{agent.mobile}</Fact>
                            <Fact label="Phone">{details.phone}</Fact>
                            <Fact label="Address">{details.address}</Fact>
                            <Fact label="City / province">{location}</Fact>
                            <Fact label="Country">
                                <CountryFlag code={agent.country_code} country={agent.country} />
                            </Fact>
                            <Fact label="Area">{agent.area ?? "Unassigned"}</Fact>
                        </Box>
                    </SectionCard>
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                    <SectionCard fill title="Personal">
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                            <Fact label="Full name">{[details.first_name, details.middle_name, details.last_name].filter(Boolean).join(" ")}</Fact>
                            <Fact label="Gender">{details.gender}</Fact>
                            <Fact label="Marital status">{details.marital_status}</Fact>
                            <Fact label="Joined Leuterio Realty">{details.joined_lr ? formatDate(details.joined_lr) : null}</Fact>
                            <Fact label="Signed up on the portal">{details.signed_up ? formatDate(details.signed_up) : null}</Fact>
                            <Fact label="Date activated">{details.date_activated ? formatDate(details.date_activated) : null}</Fact>
                        </Box>
                    </SectionCard>
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                    <SectionCard fill title="Training">
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                            <Fact label="NAO progress">
                                <Bar value={details.nao} />
                            </Fact>
                            <Fact label="NAO attendance">
                                {[details.nao_attendance_status, details.nao_date_of_attendance ? formatDate(details.nao_date_of_attendance) : null].filter(Boolean).join(" · ")}
                                {details.nao_proof_of_attendance && (
                                    <>
                                        {" · "}
                                        <MuiLink href={details.nao_proof_of_attendance} target="_blank" rel="noopener" sx={{ color: "var(--lr-primary)" }}>
                                            proof
                                        </MuiLink>
                                    </>
                                )}
                            </Fact>
                            <Fact label="FIRE certificates">
                                <Bar value={Math.round((Math.min(details.fire, 3) / 3) * 100)} />
                                <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                                    {details.fire} of 3{details.fire > 3 ? " (max reached)" : ""}
                                </Typography>
                            </Fact>
                        </Box>
                    </SectionCard>
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                    <SectionCard fill title="Credentials">
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                            <Fact label="PRC license expires">
                                <Expiry date={details.prc_expiration} />
                            </Fact>
                            <Fact label="DHSUD registration expires">
                                <Expiry date={details.dhsud_expiration} />
                            </Fact>
                            <Fact label="TIN">{details.tin_hidden ? "On file (visible to the back office)" : details.tin}</Fact>
                            <Fact label="Referral link">
                                {details.referral_link && (
                                    <MuiLink href={details.referral_link} target="_blank" rel="noopener" sx={{ color: "var(--lr-primary)", overflowWrap: "anywhere" }}>
                                        {details.referral_link}
                                    </MuiLink>
                                )}
                            </Fact>
                        </Box>
                    </SectionCard>
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                    <SectionCard fill title="Online">
                        {Object.keys(details.links).length === 0 ? (
                            <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                                No links on record.
                            </Typography>
                        ) : (
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                                {Object.entries(details.links).map(([label, url]) => (
                                    <Fact key={label} label={label}>
                                        <MuiLink href={url} target="_blank" rel="noopener" sx={{ color: "var(--lr-primary)", overflowWrap: "anywhere" }}>
                                            {url}
                                        </MuiLink>
                                    </Fact>
                                ))}
                            </Box>
                        )}
                    </SectionCard>
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <SectionCard fill title="About">
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                            <Fact label="About">{details.about}</Fact>
                            <Fact label="Skills">{details.skills}</Fact>
                            <Fact label="Work experience">{details.work_experience}</Fact>
                        </Box>
                    </SectionCard>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <History title="Teams" rows={teams} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <History title="Sub-teams" rows={subTeams} />
                </Grid>
            </Grid>

            {summary && (
                <>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
                        <Typography variant="h6" sx={{ fontSize: 18, color: "var(--lr-text-primary)", flex: 1 }}>
                            Sales
                        </Typography>
                        <Link href={`/agents/${agent.id}/sales?from=${filters.from}&to=${filters.to}`} style={{ color: "var(--lr-primary)", fontSize: 14, fontWeight: 500 }}>
                            See every sale
                        </Link>
                        <DateRangeField value={filters} presets={reportPresets()} onChange={changeRange} />
                    </Box>
                    {loading && <LinearProgress sx={{ height: 2, mb: 2 }} />}
                    <ReportStatistics summary={summary} showAreas={false} showAgentsTile={false} />
                </>
            )}
            <ConfirmDialog
                open={confirming}
                title={`Sign in as ${agent.name}?`}
                message="You'll see the portal exactly as they do. Everything you do is recorded as them and as you. Use the red banner to return to your own account."
                confirmLabel="Sign in as them"
                tone="primary"
                onConfirm={() => {
                    setConfirming(false);
                    router.post(`/impersonate/${agent.user_id}`);
                }}
                onClose={() => setConfirming(false)}
            />
        </Container>
    );
}

AgentProfile.layout = (page: ReactNode) => <AppLayout children={page} />;

export default AgentProfile;
