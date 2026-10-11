import { ReactNode, useState } from "react";
import { Box, CircularProgress, Grid, Typography } from "@mui/material";
import { FacebookRounded, ReceiptLongRounded, WorkspacePremiumRounded } from "@mui/icons-material";
import StyledButton from "../StyledButton";
import { formatDate, formatDateTime } from "../../../helpers/formatDate";

export interface PersonActivity {
    activated_at: string | null;
    last_sale: string | null;
    ends_on: string | null;
    // Negative once the window has run out (inactive for that many days).
    days_left: number | null;
    exempt: boolean;
}

export interface PersonDetailsData {
    team: string | null;
    team_joined: string | null;
    sub_team: string | null;
    sub_team_joined: string | null;
    registered: string | null;
    mobile: string | null;
    address: string | null;
    prc_expiration: string | null;
    dhsud_expiration: string | null;
    fire_count: number;
    // A working Facebook link (App\Support\SocialLinks), or null.
    facebook: string | null;
    // Sales that count (valid or pending), any category.
    sales: number;
    activity: PersonActivity | null;
}

interface Certificates {
    certificates: { course: string; taken_on: string | null; score: number | null }[];
    total: number;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
    return (
        <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" component="div" sx={{ color: "var(--lr-text-secondary)" }}>
                {label}
            </Typography>
            <Typography variant="body2" component="div" sx={{ color: "var(--lr-text-primary)", overflowWrap: "anywhere" }}>
                {children || "—"}
            </Typography>
        </Grid>
    );
}

const day = (d: string | null) => (d ? formatDate(d) : null);

// "Expires Mar 3, 2027" in red once past.
function Expiry({ date }: { date: string | null }) {
    if (!date) return null;
    const past = new Date(date) < new Date();
    return (
        <Box component="span" sx={{ color: past ? "var(--lr-error)" : "inherit" }}>
            {formatDate(date)}
            {past && " (expired)"}
        </Box>
    );
}

function ActivityWindow({ activity }: { activity: PersonActivity | null }) {
    if (!activity) return null;
    if (activity.exempt) return <>Not applicable (leader / back office)</>;
    if (activity.days_left === null) return null;
    const since = activity.last_sale && activity.last_sale > (activity.activated_at ?? "") ? `last sale ${formatDate(activity.last_sale)}` : `activated ${day(activity.activated_at) ?? "—"}`;
    return activity.days_left >= 0 ? (
        <Box component="span" sx={{ color: activity.days_left <= 30 ? "var(--lr-warning)" : "inherit" }}>
            {activity.days_left} {activity.days_left === 1 ? "day" : "days"} left · until {day(activity.ends_on)} ({since})
        </Box>
    ) : (
        <Box component="span" sx={{ color: "var(--lr-error)" }}>
            Inactive for {-activity.days_left} days ({since})
        </Box>
    );
}

// The expanded part of a person in the search results: registration, contact, licences, the 6-month window and FIRE.
interface PersonDetailsProps {
    userId: number;
    agentId: number | null;
    details: PersonDetailsData | null;
    lastActive: string | null;
    // Navigates and closes the search (GlobalSearch's goTo).
    onOpen: (path: string) => void;
}

export default function PersonDetails({ userId, agentId, details, lastActive, onOpen }: PersonDetailsProps) {
    const [certs, setCerts] = useState<Certificates | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // JSON like the search itself: it loads inside the popover, not as a page visit.
    const loadCertificates = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/search/users/${userId}/certificates`, { headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" }, credentials: "same-origin" });
            const body = await res.json();
            if (!res.ok) throw new Error(body.message ?? "Couldn't load the certificates.");
            setCerts(body);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Couldn't load the certificates.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box onClick={(e) => e.stopPropagation()} sx={{ mx: 2, mb: 1.5, p: 2, borderRadius: 3, backgroundColor: "var(--lr-surface-dim)", border: "1px solid var(--lr-border)", cursor: "default" }}>
            <Grid container spacing={1.5}>
                <Fact label="Team / Sub-team">{details?.team ? `${details.team} / ${details.sub_team ?? "No sub-team"}` : "No team"}</Fact>
                <Fact label="Joined the team">{day(details?.team_joined ?? null)}</Fact>
                <Fact label="Registered">{day(details?.registered ?? null)}</Fact>
                <Fact label="Last activity">{lastActive ? formatDateTime(lastActive) : null}</Fact>
                <Fact label="Mobile">{details?.mobile}</Fact>
                <Fact label="Address">{details?.address}</Fact>
                <Fact label="PRC expiry"><Expiry date={details?.prc_expiration ?? null} /></Fact>
                <Fact label="DHSUD expiry"><Expiry date={details?.dhsud_expiration ?? null} /></Fact>
                <Grid size={12}>
                    <Typography variant="caption" component="div" sx={{ color: "var(--lr-text-secondary)" }}>
                        6-month activity window
                    </Typography>
                    <Typography variant="body2" component="div" sx={{ color: "var(--lr-text-primary)" }}>
                        <ActivityWindow activity={details?.activity ?? null} />
                        {!details?.activity && "—"}
                    </Typography>
                </Grid>
            </Grid>

            {/* Their sales (one by one, with statistics) and Facebook — buttons rather than icons in the row. */}
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2 }}>
                {agentId && details && (
                    <StyledButton
                        size="small"
                        variant="contained"
                        startIcon={<ReceiptLongRounded />}
                        onClick={() => onOpen(`/agents/${agentId}/sales`)}
                        sx={{ backgroundColor: details.sales ? "var(--lr-primary)" : "var(--lr-surface-container)", color: details.sales ? "var(--lr-on-primary)" : "var(--lr-text-body)", boxShadow: "none", ":hover": { backgroundColor: details.sales ? "var(--lr-primary-hover)" : "var(--lr-surface-hover)", boxShadow: "none" } }}
                    >
                        {details.sales ? `${details.sales.toLocaleString()} ${details.sales === 1 ? "sale" : "sales"}` : "No sales yet"} · view
                    </StyledButton>
                )}
                {details?.facebook && (
                    <StyledButton
                        size="small"
                        variant="outlined"
                        startIcon={<FacebookRounded />}
                        href={details.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ color: "var(--lr-primary)", borderColor: "var(--lr-outline)" }}
                    >
                        Facebook profile
                    </StyledButton>
                )}
            </Box>

            <Box sx={{ mt: 2 }}>
                {!certs && (
                    <StyledButton
                        size="small"
                        variant="outlined"
                        startIcon={loading ? <CircularProgress size={14} /> : <WorkspacePremiumRounded />}
                        disabled={loading}
                        onClick={loadCertificates}
                        sx={{ color: "var(--lr-primary)", borderColor: "var(--lr-outline)" }}
                    >
                        FIRE certificates
                    </StyledButton>
                )}
                {error && (
                    <Typography variant="body2" sx={{ color: "var(--lr-error)", mt: 1 }}>
                        {error}
                    </Typography>
                )}
                {certs && (
                    <Box>
                        <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)", fontWeight: 600 }}>
                            FIRE courses taken{certs.total > certs.certificates.length ? ` (latest ${certs.certificates.length} of ${certs.total})` : ""}
                        </Typography>
                        {certs.certificates.length === 0 ? (
                            <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                                No courses taken on the training site yet.
                            </Typography>
                        ) : (
                            <Box component="ol" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
                                {certs.certificates.map((c, i) => (
                                    <Typography key={i} component="li" variant="body2" sx={{ color: "var(--lr-text-primary)" }}>
                                        {c.course}
                                        <Typography component="span" variant="caption" sx={{ color: "var(--lr-text-secondary)", ml: 0.75 }}>
                                            {[c.taken_on && formatDate(c.taken_on), c.score !== null && `score ${c.score}`].filter(Boolean).join(" · ")}
                                        </Typography>
                                    </Typography>
                                ))}
                            </Box>
                        )}
                    </Box>
                )}
            </Box>
        </Box>
    );
}
