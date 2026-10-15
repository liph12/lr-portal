import { ReactNode, useEffect, useState } from "react";
import { Alert, Box, Collapse, Container, Grid, IconButton, Skeleton, Tooltip, Typography } from "@mui/material";
import { CheckCircleRounded, ContentCopyRounded, ErrorRounded, ExpandMoreRounded, HourglassTopRounded, PlayArrowRounded, RadioButtonUncheckedRounded } from "@mui/icons-material";
import { Deferred, router } from "@inertiajs/react";
import AppLayout from "../../../../components/layouts/AppLayout";
import SectionTitle from "../../../../components/utils/SectionTitle";
import SectionCard from "../../../../components/cards/SectionCard";
import StyledButton from "../../../../components/utils/StyledButton";
import StatusChip from "../../../../components/utils/StatusChip";
import ConfirmDialog from "../../../../components/utils/ConfirmDialog";
import { formatDateTime } from "../../../../helpers/formatDate";
import { toast } from "../../../../helpers/toast";

type StepStatus = "waiting" | "running" | "done" | "failed";

interface RunStep {
    command: string;
    label: string;
    status: StepStatus;
    seconds?: number;
    output?: string;
}

interface Run {
    id: number;
    status: "queued" | "running" | "done" | "failed";
    fresh: boolean;
    steps: RunStep[];
    error: string | null;
    started_by: string | null;
    started_at: string | null;
    finished_at: string | null;
}

interface LegacyMigrationProps {
    steps: { command: string; label: string }[];
    latest: Run | null;
    running: boolean;
    // The legacy database (loaded after the page): reachable, size, and the excluded tables in it.
    source?: { database: string; host: string; connected: boolean; tables: number; size_mb: number; excluded: { name: string; present: boolean; size_mb: number }[]; error: string | null };
    excluded: string[];
}

const RUN_TONE: Record<Run["status"], [string, string]> = { queued: ["pending", "Starting"], running: ["pending", "Running"], done: ["valid", "Finished"], failed: ["invalid", "Failed"] };

function StepIcon({ status }: { status: StepStatus }) {
    const sx = { fontSize: 20 };
    if (status === "done") return <CheckCircleRounded sx={{ ...sx, color: "var(--lr-success-icon)" }} />;
    if (status === "failed") return <ErrorRounded sx={{ ...sx, color: "var(--lr-error)" }} />;
    if (status === "running") return <HourglassTopRounded sx={{ ...sx, color: "var(--lr-primary)" }} />;
    return <RadioButtonUncheckedRounded sx={{ ...sx, color: "var(--lr-outline)" }} />;
}

// One command to copy, with what it's for.
function Command({ text, note }: { text: string; note: string }) {
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success("Copied.");
        } catch {
            toast.error("Couldn't copy.");
        }
    };
    return (
        <Box>
            <Typography variant="body2" sx={{ color: "var(--lr-text-body)", mb: 0.75 }}>
                {note}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, pl: 1.5, pr: 0.5, py: 0.5, borderRadius: 2, backgroundColor: "var(--lr-surface-container)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13, color: "var(--lr-text-primary)" }}>
                <Box component="code" sx={{ flex: 1, overflowX: "auto", whiteSpace: "nowrap", py: 0.75 }}>
                    {text}
                </Box>
                <Tooltip title="Copy">
                    <IconButton size="small" aria-label={`Copy: ${text}`} onClick={copy} sx={{ color: "var(--lr-text-secondary)" }}>
                        <ContentCopyRounded fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    );
}

// Settings › Legacy migration — for developers: the old system's database, the import steps in order and how the last run went,
// the commands for deploy day, and a button to run the import on this database.
function LegacyMigration({ steps, latest, running, source, excluded }: LegacyMigrationProps) {
    const [confirming, setConfirming] = useState(false);
    const [open, setOpen] = useState<string | null>(null);
    const byCommand = new Map((latest?.steps ?? []).map((s) => [s.command, s]));
    const firstFailed = latest?.steps.find((s) => s.status === "failed")?.command;

    // While a run is going, follow it.
    useEffect(() => {
        if (!running) return;
        const timer = setInterval(() => router.reload({ only: ["latest", "running"], preserveUrl: true, async: true }), 3000);
        return () => clearInterval(timer);
    }, [running]);

    const start = (from?: string) => router.post("/superadmin/settings/legacy-migration", from ? { from } : {}, { preserveScroll: true });

    return (
        <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4 } }}>
            <SectionTitle title="Legacy migration" subtitle="For developers: the old system's database → this portal. The same steps run from the command line on deploy day." />

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 5 }}>
                    <SectionCard title="Legacy database" subtitle="Where the import reads from (LEGACY_DB_* in .env)">
                        <Deferred data="source" fallback={<Skeleton variant="rounded" height={120} />}>
                            {source?.connected ? (
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                        <StatusChip status="valid">Connected</StatusChip>
                                        <Typography variant="body2" sx={{ color: "var(--lr-text-primary)", fontWeight: 600 }}>
                                            {source.database}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                                            on {source.host}
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{ color: "var(--lr-text-body)" }}>
                                        {source.tables} tables · {source.size_mb.toLocaleString()} MB
                                    </Typography>
                                    <Box>
                                        <Typography variant="caption" sx={{ fontWeight: 600, color: "var(--lr-text-secondary)" }}>
                                            NEVER COPIED
                                        </Typography>
                                        {source.excluded.map((t) => (
                                            <Typography key={t.name} variant="body2" sx={{ color: "var(--lr-text-body)" }}>
                                                <Box component="code" sx={{ fontSize: 13 }}>
                                                    {t.name}
                                                </Box>{" "}
                                                <Box component="span" sx={{ color: "var(--lr-text-secondary)" }}>
                                                    — {t.present ? `${t.size_mb.toLocaleString()} MB here` : "not in this copy"}
                                                </Box>
                                            </Typography>
                                        ))}
                                    </Box>
                                </Box>
                            ) : (
                                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                                    {source?.error ?? "The legacy database can't be reached."}
                                </Alert>
                            )}
                        </Deferred>
                    </SectionCard>
                </Grid>

                <Grid size={{ xs: 12, md: 7 }}>
                    <SectionCard title="Deploy day" subtitle="From the project folder on the server">
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                            <Command note="First, on your machine: rehearse all of it in throwaway databases and compare with yours (about 1½ minutes; your data is only read)." text="php artisan legacy:rehearse" />
                            <Command note={`1. Where the old database can be reached (LEGACY_DB_* pointing at it): dump it without ${excluded.join(", ")}.`} text="php artisan legacy:dump" />
                            <Command note="2. On the new server (LEGACY_DB_* = an empty database): load the dump." text="php artisan legacy:restore storage/app/private/legacy/<file>.sql.gz" />
                            <Command note="3. Build the portal database and import everything (erases the portal database)." text="php artisan legacy:migrate --fresh --force" />
                            <Command note="Afterwards — new migrations, or a newer legacy copy: applies them and adds what's new (new members, sales…). Records already imported stay as they are (documents, offices and cutoffs are refreshed); for everything up to date, rebuild with --fresh." text="php artisan legacy:migrate" />
                        </Box>
                    </SectionCard>
                </Grid>
            </Grid>

            <Box sx={{ mt: 4 }}>
                <SectionTitle
                    title="Import steps"
                    subtitle={
                        latest
                            ? `Last run${latest.fresh ? " (fresh)" : ""}${latest.started_by ? ` by ${latest.started_by}` : ""}${latest.started_at ? ` · ${formatDateTime(latest.started_at)}` : ""}`
                            : "Not run from here yet. In order; a failed step stops the run."
                    }
                    action={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            {latest && <StatusChip status={RUN_TONE[latest.status][0]}>{RUN_TONE[latest.status][1]}</StatusChip>}
                            {firstFailed && !running && (
                                <StyledButton size="small" onClick={() => start(firstFailed)} sx={{ color: "var(--lr-primary)" }}>
                                    Resume from the failed step
                                </StyledButton>
                            )}
                            <StyledButton
                                variant="contained"
                                startIcon={<PlayArrowRounded />}
                                disabled={running}
                                onClick={() => setConfirming(true)}
                                sx={{ px: 2.5, backgroundColor: "var(--lr-primary)", color: "var(--lr-on-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" }, "&.Mui-disabled": { backgroundColor: "var(--lr-surface-container)", color: "var(--lr-text-secondary)" } }}
                            >
                                {running ? "Running…" : "Run the import"}
                            </StyledButton>
                        </Box>
                    }
                />
                {latest?.error && (
                    <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                        {latest.error}
                    </Alert>
                )}
                <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, borderRadius: 3, border: "1px solid var(--lr-border)", backgroundColor: "var(--lr-surface)", overflow: "hidden" }}>
                    {steps.map((step, i) => {
                        const run = byCommand.get(step.command);
                        const status: StepStatus = run?.status ?? "waiting";
                        const expanded = open === step.command;
                        return (
                            <Box component="li" key={step.command} sx={{ borderTop: i ? "1px solid var(--lr-border)" : "none" }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.25 }}>
                                    <StepIcon status={status} />
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--lr-text-primary)" }}>
                                            {i + 1}. {step.label}
                                        </Typography>
                                        <Typography component="code" variant="caption" sx={{ color: "var(--lr-text-secondary)", fontFamily: "ui-monospace, Menlo, monospace" }}>
                                            {step.command}
                                        </Typography>
                                    </Box>
                                    {run?.seconds !== undefined && (
                                        <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                                            {run.seconds < 60 ? `${run.seconds}s` : `${Math.floor(run.seconds / 60)}m ${Math.round(run.seconds % 60)}s`}
                                        </Typography>
                                    )}
                                    {run?.output && (
                                        <IconButton size="small" aria-label={expanded ? "Hide output" : "Show output"} aria-expanded={expanded} onClick={() => setOpen(expanded ? null : step.command)}>
                                            <ExpandMoreRounded sx={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }} />
                                        </IconButton>
                                    )}
                                </Box>
                                <Collapse in={expanded} unmountOnExit>
                                    <Box component="pre" sx={{ m: 0, px: 2, py: 1.5, maxHeight: 280, overflow: "auto", fontSize: 12, whiteSpace: "pre-wrap", color: "var(--lr-text-body)", backgroundColor: "var(--lr-surface-container)" }}>
                                        {run?.output}
                                    </Box>
                                </Collapse>
                            </Box>
                        );
                    })}
                </Box>
            </Box>

            <ConfirmDialog
                open={confirming}
                title="Run the legacy import on this database?"
                message="Every step runs in order against the legacy database above. It adds what's new; records already imported stay as they are (documents, offices and cutoffs are refreshed) and nothing is erased — a full rebuild (--fresh) is command-line only. About a minute; you can leave this page."
                confirmLabel="Run the import"
                tone="primary"
                onConfirm={() => {
                    setConfirming(false);
                    start();
                }}
                onClose={() => setConfirming(false)}
            />
        </Container>
    );
}

LegacyMigration.layout = (page: ReactNode) => <AppLayout children={page} />;

export default LegacyMigration;
