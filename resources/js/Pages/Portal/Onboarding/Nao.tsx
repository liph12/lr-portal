import { ReactNode, useEffect, useRef, useState } from "react";
import { Alert, Box, Link as MuiLink, Typography } from "@mui/material";
import { ArrowBackRounded, ArrowForwardRounded, CheckCircleRounded, HourglassTopRounded } from "@mui/icons-material";
import { Link, router } from "@inertiajs/react";
import OnboardingShell from "../../../components/layouts/OnboardingShell";
import StyledButton from "../../../components/utils/StyledButton";
import NaoChoice from "../../../components/onboarding/NaoChoice";
import NaoAttendanceForm from "../../../components/onboarding/NaoAttendanceForm";
import SponsorContactCard from "../../../components/onboarding/SponsorContactCard";
import WebinarPlayer from "../../../components/onboarding/WebinarPlayer";
import { formatDate } from "../../../helpers/formatDate";
import { toast } from "../../../helpers/toast";
import { NaoState } from "../../../types/app-data-types";

interface NaoProps {
    nao: NaoState;
    maxFileKb: number;
}

const primaryButtonSx = { px: 3, backgroundColor: "var(--lr-primary)", color: "var(--lr-on-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } };

function DashboardButton() {
    return (
        <Link href="/dashboard/main" style={{ textDecoration: "none" }}>
            <StyledButton variant="contained" endIcon={<ArrowForwardRounded />} sx={primaryButtonSx}>
                Go to my dashboard
            </StyledButton>
        </Link>
    );
}

function StatusPanel({ icon, tone, title, children }: { icon: ReactNode; tone: "success" | "warning"; title: string; children: ReactNode }) {
    return (
        <Box sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 3, border: "1px solid var(--lr-border)", backgroundColor: `var(--lr-${tone}-soft)` }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, color: `var(--lr-${tone})` }}>
                {icon}
                <Typography sx={{ fontSize: 18, fontWeight: 600, color: "var(--lr-text-primary)" }}>{title}</Typography>
            </Box>
            <Box sx={{ mt: 1.5, color: "var(--lr-text-body)" }}>{children}</Box>
        </Box>
    );
}

// Onboarding step 2: the New Agents Orientation. Attended one face to face → proof + date for the sponsor to approve (then
// how to reach them); not yet → the New Agents Webinar, which saves how far they got.
function Nao({ nao, maxFileKb }: NaoProps) {
    const finished = nao.stage === "done";
    const [showForm, setShowForm] = useState(false);
    const [choosing, setChoosing] = useState(false);
    const wasFinished = useRef(finished);

    // The page comes back with its local state kept: a new submission closes the form to show the waiting screen.
    useEffect(() => setShowForm(false), [nao.submitted_at]);

    useEffect(() => {
        if (finished && !wasFinished.current) toast.success("You finished the New Agents Webinar. Your NAO is complete!");
        wasFinished.current = finished;
    }, [finished]);

    const chooseWebinar = () => router.post("/welcome/nao/webinar", {}, { preserveScroll: true, onStart: () => setChoosing(true), onFinish: () => setChoosing(false) });
    const skip = (
        <StyledButton onClick={() => router.post("/welcome/skip")} sx={{ color: "var(--lr-text-secondary)" }}>
            Skip for now
        </StyledButton>
    );

    let title = "New Agents Orientation";
    let intro = "Have you already attended the New Agents Orientation (NAO) in person?";
    let body: ReactNode;

    if (finished) {
        title = "Your NAO is complete";
        intro = "Thank you — you're all set for now.";
        body = (
            <>
                <StatusPanel icon={<CheckCircleRounded />} tone="success" title={nao.approved ? "Attendance approved" : "New Agents Webinar finished"}>
                    <Typography variant="body2">This step is done — the rest of the portal is yours to explore.</Typography>
                </StatusPanel>
                <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end", gap: 1.5, flexWrap: "wrap" }}>
                    <Link href="/my-journey" style={{ textDecoration: "none" }}>
                        <StyledButton sx={{ color: "var(--lr-primary)" }}>See my journey</StyledButton>
                    </Link>
                    <DashboardButton />
                </Box>
            </>
        );
    } else if (showForm) {
        intro = "Upload your proof of attendance and the date of the NAO. Your sponsor / upline approves it.";
        body = <NaoAttendanceForm maxFileKb={maxFileKb} onCancel={() => setShowForm(false)} onSent={() => setShowForm(false)} />;
    } else if (nao.stage === "awaiting") {
        title = "Waiting for your sponsor's approval";
        intro = "We've got your NAO attendance. Please reach out to your sponsor / upline so they can approve your NAO.";
        body = (
            <>
                <StatusPanel icon={<HourglassTopRounded />} tone="warning" title="Sent for approval">
                    <Typography variant="body2">
                        NAO attended on <strong>{nao.attended_on ? formatDate(nao.attended_on) : "—"}</strong>
                        {nao.submitted_at && <> · sent {formatDate(nao.submitted_at)}</>}
                        {nao.proof && (
                            <>
                                {" · "}
                                <MuiLink href={nao.proof} target="_blank" rel="noopener" sx={{ color: "var(--lr-primary)" }}>
                                    View your proof
                                </MuiLink>
                            </>
                        )}
                    </Typography>
                </StatusPanel>
                <Typography sx={{ mt: 3, mb: 1.5, fontWeight: 500, color: "var(--lr-text-primary)" }}>Contact your sponsor to approve your attendance</Typography>
                {nao.sponsor ? (
                    <SponsorContactCard sponsor={nao.sponsor} />
                ) : (
                    <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                        No sponsor is on file for your account — please contact your branch office.
                    </Typography>
                )}
                <Box sx={{ mt: 3, display: "flex", gap: 1.5, justifyContent: "space-between", flexWrap: "wrap" }}>
                    <StyledButton onClick={() => setShowForm(true)} sx={{ color: "var(--lr-primary)" }}>
                        Send a different proof
                    </StyledButton>
                    <DashboardButton />
                </Box>
            </>
        );
    } else if (nao.stage === "webinar") {
        title = "New Agents Webinar";
        intro = "Watch the whole webinar to complete your NAO. You can't skip ahead, but you can pause and come back — it picks up where you left off.";
        body = (
            <>
                <WebinarPlayer videoId={nao.video.id} duration={nao.video.seconds} watched={nao.seconds} />
                <Box sx={{ mt: 2.5, display: "flex", gap: 1.5, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                    <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                        Attended a face-to-face NAO after all?{" "}
                        <MuiLink component="button" type="button" onClick={() => setShowForm(true)} sx={{ color: "var(--lr-primary)", verticalAlign: "baseline" }}>
                            Send your proof instead
                        </MuiLink>
                    </Typography>
                    {skip}
                </Box>
            </>
        );
    } else {
        body = (
            <>
                {nao.stage === "disapproved" && (
                    <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }}>
                        Your NAO attendance wasn't approved{nao.remarks ? <>: <strong>{nao.remarks}</strong></> : "."} Send another proof, or watch the New
                        Agents Webinar.
                    </Alert>
                )}
                <NaoChoice onAttended={() => setShowForm(true)} onWebinar={chooseWebinar} disabled={choosing} />
                <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>{skip}</Box>
            </>
        );
    }

    return (
        <OnboardingShell>
            <Box sx={{ maxWidth: 860, mx: "auto" }}>
                <Link href="/welcome/photo" style={{ textDecoration: "none" }}>
                    <StyledButton size="small" startIcon={<ArrowBackRounded />} sx={{ mb: 1, px: 1, color: "var(--lr-primary)" }}>
                        Back
                    </StyledButton>
                </Link>
                <Typography variant="caption" sx={{ display: "block", fontWeight: 600, letterSpacing: "0.12em", color: "var(--lr-primary)" }}>
                    STEP 2 · NEW AGENTS ORIENTATION
                </Typography>
                <Typography component="h1" sx={{ mt: 0.5, fontSize: { xs: 26, sm: 30 }, color: "var(--lr-text-primary)" }}>
                    {title}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, mb: 3, color: "var(--lr-text-secondary)", maxWidth: 640 }}>
                    {intro}
                </Typography>
                {body}
            </Box>
        </OnboardingShell>
    );
}

export default Nao;
