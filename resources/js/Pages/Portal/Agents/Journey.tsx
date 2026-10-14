import { ReactElement, ReactNode, useState } from "react";
import { Box, Container, LinearProgress, Skeleton, Typography } from "@mui/material";
import { ArrowForwardRounded, CheckRounded, DownloadRounded, HourglassTopRounded, LockOutlined, OpenInNewRounded, WorkspacePremiumRounded } from "@mui/icons-material";
import { Deferred, Link } from "@inertiajs/react";
import OnboardingShell from "../../../components/layouts/OnboardingShell";
import StyledButton from "../../../components/utils/StyledButton";
import FireLogo from "../../../components/fire/FireLogo";
import ModuleLogo from "../../../components/fire/ModuleLogo";
import SpotIcon, { SpotName } from "../../../components/utils/SpotIcon";
import UserAvatar from "../../../components/utils/user/UserAvatar";
import ActivationRequestForm from "../../../components/onboarding/ActivationRequestForm";
import { formatDate } from "../../../helpers/formatDate";

type Status = "done" | "current" | "waiting" | "upcoming";

interface Milestone {
    key: "registered" | "photo" | "nao" | "fire" | "activation";
    title: string;
    status: Status;
    date: string | null;
    detail: string;
    certificates?: number;
    of?: number;
    // Activation: the latest request for activation sent (null = none yet).
    activation?: ActivationRequest | null;
}

interface ActivationRequest {
    submitted_at: string;
    request_form: string;
    proof_of_transaction: string;
    notes: string | null;
}

interface JourneyProps {
    journey: {
        agent: { id: number; name: string; first_name: string; avatar: string | null; branch: string | null; team: string | null; sub_team: string | null; sponsor: { name: string; avatar: string | null } | null };
        milestones: Milestone[];
        done: number;
    };
    // The reader's own journey: speak to them ("you"), and offer the next step.
    own: boolean;
    maxFileKb: number;
    // Loaded after the page (asks the training site): the certificates earned, each with its download.
    certificates?: { items: Certificate[]; error: string | null };
}

interface Certificate {
    module: number;
    title: string;
    brand: "rentph" | null;
    taken_on: string | null;
    url: string;
}

// Short names for the journey bar.
const LABELS: Record<Milestone["key"], string> = { registered: "Registered", photo: "Profile photo", nao: "NAO", fire: "FIRE", activation: "Activation" };

const primaryButton = { px: 3, py: 1.1, fontSize: 15, backgroundColor: "var(--lr-primary)", color: "var(--lr-on-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } };

function greeting(): string {
    const hour = new Date().getHours();
    return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

// One step on the journey bar: a check when done, an hourglass while waiting, the step's number otherwise.
function Dot({ status, index }: { status: Status; index: number }) {
    const done = status === "done";
    const active = status === "current" || status === "waiting";
    return (
        <Box
            sx={{
                position: "relative",
                zIndex: 1,
                width: 34,
                height: 34,
                flexShrink: 0,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontSize: 14,
                fontWeight: 700,
                color: done || active ? "var(--lr-on-primary)" : "var(--lr-text-secondary)",
                backgroundColor: done ? "var(--lr-success-icon)" : active ? "var(--lr-primary)" : "var(--lr-surface)",
                border: done || active ? "none" : "2px solid var(--lr-outline)",
                boxShadow: active ? "0 0 0 5px var(--lr-primary-soft-strong)" : "none",
            }}
        >
            {done ? <CheckRounded sx={{ fontSize: 20 }} /> : status === "waiting" ? <HourglassTopRounded sx={{ fontSize: 17 }} /> : index + 1}
        </Box>
    );
}

// The journey at a glance: five steps in a row (a column on phones), the line filled up to where they are.
function JourneyBar({ milestones }: { milestones: Milestone[] }) {
    return (
        <Box component="ol" aria-label="Journey" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: { xs: 2, sm: 0 } }}>
            {milestones.map((m, i) => {
                const last = i === milestones.length - 1;
                const active = m.status === "current" || m.status === "waiting";
                return (
                    <Box component="li" key={m.key} sx={{ flex: 1, position: "relative", display: "flex", flexDirection: { xs: "row", sm: "column" }, alignItems: "center", gap: { xs: 1.5, sm: 1 }, textAlign: { sm: "center" } }}>
                        {!last && (
                            <Box
                                aria-hidden
                                sx={{
                                    position: "absolute",
                                    backgroundColor: m.status === "done" ? "var(--lr-success-icon)" : "var(--lr-border)",
                                    // Across to the next dot on wide screens, down to it on phones.
                                    left: { xs: 16, sm: "calc(50% + 17px)" },
                                    right: { sm: "calc(-50% + 17px)" },
                                    top: { xs: 34, sm: 16 },
                                    bottom: { xs: -16, sm: "auto" },
                                    width: { xs: 2, sm: "auto" },
                                    height: { xs: "auto", sm: 2 },
                                }}
                            />
                        )}
                        <Dot status={m.status} index={i} />
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: active ? 700 : 600, color: active ? "var(--lr-primary)" : m.status === "upcoming" ? "var(--lr-text-secondary)" : "var(--lr-text-primary)" }}>
                                {LABELS[m.key]}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                                {m.status === "done" ? (m.date ? formatDate(m.date) : "Done") : m.status === "waiting" ? (m.key === "activation" ? "Waiting for activation" : "Waiting for approval") : active ? "Next up" : "Later"}
                            </Typography>
                        </Box>
                    </Box>
                );
            })}
        </Box>
    );
}

// Where the next step is done, and what its button says (none while a NAO waits for approval).
function nextAction(next: Milestone): { href: string; label: string } | null {
    switch (next.key) {
        case "fire":
            return { href: "/fire", label: (next.certificates ?? 0) > 0 ? "Continue FIRE" : "Start FIRE" };
        case "photo":
            return { href: "/profile", label: "Add my photo" };
        case "nao":
            return next.status === "waiting" ? null : { href: "/welcome/nao", label: "Continue my NAO" };
        // Sent from the card itself (the activation request uploader).
        case "activation":
            return null;
        default:
            return null;
    }
}

// What activating the LR account takes, and the uploader — or, once sent, what was sent (with a way to send it again).
function Activation({ request, own, maxFileKb }: { request: ActivationRequest | null; own: boolean; maxFileKb: number }) {
    const [resend, setResend] = useState(false);
    const steps = [
        "Close your first sale and have it ready for encoding.",
        "Fill in and sign your request for activation.",
        "Upload it here with the sale's proof of transaction — the office activates your account and encodes your sale.",
    ];
    const file = (href: string, label: string) => (
        <a href={href} target="_blank" rel="noopener" style={{ textDecoration: "none" }}>
            <StyledButton variant="outlined" size="small" endIcon={<OpenInNewRounded />} sx={{ color: "var(--lr-primary)", borderColor: "var(--lr-outline)", backgroundColor: "var(--lr-surface)" }}>
                {label}
            </StyledButton>
        </a>
    );

    return (
        <Box sx={{ mt: 2.5 }}>
            {own && !request && (
                <Box component="ol" sx={{ m: 0, mb: 3, pl: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 1.25 }}>
                    {steps.map((text, i) => (
                        <Box component="li" key={i} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                            <Box sx={{ width: 26, height: 26, flexShrink: 0, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, color: "var(--lr-on-primary)", backgroundColor: "var(--lr-primary)" }}>{i + 1}</Box>
                            <Typography variant="body2" sx={{ pt: 0.3, color: "var(--lr-text-body)" }}>
                                {text}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            )}
            {request ? (
                <Box sx={{ p: 2, borderRadius: 3, border: "1px solid var(--lr-border)", backgroundColor: "var(--lr-surface)" }}>
                    <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 600, color: "var(--lr-text-primary)" }}>
                        <HourglassTopRounded sx={{ fontSize: 18, color: "var(--lr-primary)" }} /> Request for activation sent {formatDate(request.submitted_at)}
                    </Typography>
                    {request.notes && (
                        <Typography variant="body2" sx={{ mt: 0.75, color: "var(--lr-text-secondary)", whiteSpace: "pre-line" }}>
                            {request.notes}
                        </Typography>
                    )}
                    <Box sx={{ mt: 1.5, display: "flex", gap: 1, flexWrap: "wrap" }}>
                        {file(request.request_form, "Request for activation")}
                        {file(request.proof_of_transaction, "Proof of transaction")}
                        {own && !resend && (
                            <StyledButton size="small" onClick={() => setResend(true)} sx={{ color: "var(--lr-primary)" }}>
                                Send again
                            </StyledButton>
                        )}
                    </Box>
                </Box>
            ) : (
                !own && (
                    <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                        No request for activation yet.
                    </Typography>
                )
            )}
            {own && (!request || resend) && (
                <Box sx={{ mt: request ? 2.5 : 0 }}>
                    <ActivationRequestForm maxFileKb={maxFileKb} onCancel={request ? () => setResend(false) : undefined} onSent={() => setResend(false)} />
                </Box>
            )}
        </Box>
    );
}

// The next step, as an invitation: FIRE gets its own logo and a warm word; the others a short nudge.
function NextStep({ next, name, own, naoDone, maxFileKb }: { next: Milestone; name: string; own: boolean; naoDone: boolean; maxFileKb: number }) {
    const card = (art: ReactNode, title: string, text: string, action?: ReactNode, extra?: ReactNode, alignTop = false) => (
        <Box
            sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                alignItems: { md: alignTop ? "flex-start" : "center" },
                gap: { xs: 2.5, md: 4 },
                p: { xs: 3, sm: 4 },
                borderRadius: 4,
                border: "1px solid var(--lr-primary-soft-strong)",
                backgroundColor: "var(--lr-primary-soft)",
            }}
        >
            <Box sx={{ flexShrink: 0 }}>{art}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography component="h2" sx={{ fontSize: { xs: 21, sm: 24 }, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--lr-text-primary)" }}>
                    {title}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, color: "var(--lr-text-body)", lineHeight: 1.7, maxWidth: 560 }}>
                    {text}
                </Typography>
                {extra}
                {/* Phones have it pinned to the bottom of the screen instead. */}
                {own && action && <Box sx={{ mt: 2.5, display: { xs: "none", sm: "block" } }}>{action}</Box>}
            </Box>
        </Box>
    );
    const action = nextAction(next);
    const go = action && (
        <Link href={action.href} style={{ textDecoration: "none" }}>
            <StyledButton variant="contained" endIcon={<ArrowForwardRounded />} sx={primaryButton}>
                {action.label}
            </StyledButton>
        </Link>
    );

    if (next.key === "fire") {
        const passed = next.certificates ?? 0;
        const of = next.of ?? 3;
        return card(
            <FireLogo sx={{ width: { xs: 180, md: 240 } }} />,
            own ? (naoDone ? `You're ready for FIRE, ${name}!` : `FIRE is waiting for you, ${name}`) : `${name} is ready for FIRE`,
            own
                ? "FIRE is the Filipinohomes Institute of Real Estate — short video modules from experienced brokers and lawyers, each with a quick exam. It's the fastest way to sell with confidence. Pass three modules to complete it."
                : "FIRE — the Filipinohomes Institute of Real Estate: short video modules, each with a quick exam. Three passed modules complete it.",
            go,
            <Box sx={{ mt: 2, maxWidth: 320 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: "var(--lr-text-secondary)" }}>
                        Modules passed
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "var(--lr-primary)" }}>
                        {passed} of {of}
                    </Typography>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={(Math.min(passed, of) * 100) / of}
                    aria-label="FIRE modules passed"
                    sx={{ height: 8, borderRadius: 99, backgroundColor: "var(--lr-primary-soft-strong)", "& .MuiLinearProgress-bar": { backgroundColor: "var(--lr-primary)", borderRadius: 99 } }}
                />
            </Box>,
        );
    }
    if (next.key === "activation") {
        const waiting = next.status === "waiting";
        return card(
            <SpotIcon name="trophy" size={72} />,
            waiting ? (own ? "Your activation is on its way" : "Activation requested") : own ? "Activate your LR account with your first sale" : `${name}'s activation`,
            own
                ? waiting
                    ? "Thanks! The office will check your request, activate your account and encode your sale. You'll see it here once it's in."
                    : "Training done — now it's time to close. Your LR account is activated with your first sale: once it's ready for encoding, send your request for activation together with the sale's proof of transaction."
                : next.detail,
            undefined,
            <Activation request={next.activation ?? null} own={own} maxFileKb={maxFileKb} />,
            // A tall card (the uploader): the trophy stays beside the title.
            true,
        );
    }
    if (next.key === "registered") return null;
    const steps: Record<"photo" | "nao", [SpotName, string, string]> = {
        photo: ["team", "Add your profile photo", "A clear, friendly photo helps clients and your team recognise you — on your profile and your business card."],
        nao: ["graduation", next.status === "waiting" ? "Your NAO is being reviewed" : "Complete your NAO", next.detail],
    };
    const [art, title, text] = steps[next.key];
    return card(<SpotIcon name={art} size={72} />, title, text, go ?? undefined);
}

// The certificates earned so far, each downloadable as an image (FIRE modules' Certificates of Completion, Rent.ph's Rent Manager
// accreditation). Nothing to show until there's at least one.
function Certificates({ data, own }: { data?: JourneyProps["certificates"]; own: boolean }) {
    const rentLocked = own && !!data && !data.error && !data.items.some((c) => c.brand === "rentph");
    if (!data) return null;
    if (data.error) {
        return (
            <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)" }}>
                Certificates can't be loaded right now: {data.error}
            </Typography>
        );
    }
    if (!data.items.length && !rentLocked) return null;

    return (
        <Box>
            <Typography component="h2" sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 18, fontWeight: 700, color: "var(--lr-text-primary)", mb: 1.5 }}>
                <WorkspacePremiumRounded sx={{ color: "var(--lr-accent)" }} /> {own ? "Your certificates" : "Certificates"}
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
                {data.items.map((c) => (
                    <Box key={c.module} sx={{ display: "flex", alignItems: "center", gap: 2, p: 2, borderRadius: 3, border: "1px solid var(--lr-border)", backgroundColor: "var(--lr-surface)" }}>
                        <Box sx={{ width: c.brand === "rentph" ? 92 : 44, flexShrink: 0 }}>
                            {/* FIRE's shield alone (the wordmark is unreadable this small); Rent.ph's logo as is. */}
                            {c.brand === "rentph" ? (
                                <ModuleLogo module={{ brand: "rentph" }} width={150} />
                            ) : (
                                <FireLogo sx={{ width: 44, height: 48, objectFit: "cover", objectPosition: "left center" }} />
                            )}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)", fontWeight: 600 }}>
                                {c.brand === "rentph" ? "Certificate of Accreditation" : "Certificate of Completion"}
                            </Typography>
                            <Typography sx={{ fontWeight: 600, color: "var(--lr-text-primary)", lineHeight: 1.3 }}>{c.brand === "rentph" ? "Rent Manager" : c.title}</Typography>
                            {c.taken_on && (
                                <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                                    {c.taken_on}
                                </Typography>
                            )}
                        </Box>
                        {/* A file download, not a page: a plain link. */}
                        <a href={c.url} download style={{ textDecoration: "none", flexShrink: 0 }}>
                            <StyledButton variant="outlined" size="small" startIcon={<DownloadRounded />} sx={{ color: "var(--lr-primary)", borderColor: "var(--lr-outline)" }}>
                                Download
                            </StyledButton>
                        </a>
                    </Box>
                ))}
                {/* Rent.ph's certificate is open to everyone: until it's earned, the way to it. */}
                {rentLocked && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, p: 2, borderRadius: 3, border: "1px dashed var(--lr-outline)", backgroundColor: "var(--lr-surface)" }}>
                        <Box sx={{ width: 92, flexShrink: 0 }}>
                            <ModuleLogo module={{ brand: "rentph" }} width={150} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="caption" sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "var(--lr-text-secondary)", fontWeight: 600 }}>
                                <LockOutlined sx={{ fontSize: 13 }} /> Certificate of Accreditation
                            </Typography>
                            <Typography sx={{ fontWeight: 600, color: "var(--lr-text-primary)", lineHeight: 1.3 }}>Rent Manager</Typography>
                            <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                                Pass Rent.ph's exam to download it.
                            </Typography>
                        </Box>
                        <Link href="/fire/12" style={{ textDecoration: "none", flexShrink: 0 }}>
                            <StyledButton variant="outlined" size="small" endIcon={<ArrowForwardRounded />} sx={{ color: "var(--lr-primary)", borderColor: "var(--lr-outline)" }}>
                                Take it
                            </StyledButton>
                        </Link>
                    </Box>
                )}
            </Box>
        </Box>
    );
}

// An agent's onboarding journey, as a page of its own: a greeting, the journey at a glance, and an invitation to the next step
// (FIRE once the NAO is done). Opened from the NAO step, the profile menu ("My journey") or an agent's profile.
function Journey({ journey, own, maxFileKb, certificates }: JourneyProps) {
    const { agent, milestones, done } = journey;
    const name = agent.first_name || agent.name;
    const next = milestones.find((m) => m.status !== "done");
    const naoDone = milestones.find((m) => m.key === "nao")?.status === "done";
    const activation = milestones.find((m) => m.key === "activation");
    const where = [agent.branch && `${agent.branch} branch`, [agent.team, agent.sub_team].filter(Boolean).join(" / ")].filter(Boolean).join(" · ");
    const action = own && next ? nextAction(next) : null;

    return (
        // On phones the invitation comes right after the greeting (before the journey bar), so its button is in view.
        <Container maxWidth="md" disableGutters sx={{ display: "flex", flexDirection: "column" }}>
            {/* The greeting. */}
            <Box sx={{ order: 0, display: "flex", alignItems: "center", gap: { xs: 2, sm: 3 } }}>
                <Box sx={{ borderRadius: "50%", p: 0.5, border: "3px solid var(--lr-accent)", flexShrink: 0 }}>
                    <UserAvatar name={agent.name} src={agent.avatar} size={84} sx={{ width: { xs: 64, sm: 84 }, height: { xs: 64, sm: 84 } }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", fontWeight: 500 }}>
                        {own ? `${greeting()},` : "The journey of"}
                    </Typography>
                    <Typography component="h1" sx={{ fontSize: { xs: 26, sm: 32 }, fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1.15, color: "var(--lr-text-primary)" }}>
                        {own ? `${name} 👋` : agent.name}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, color: "var(--lr-text-secondary)" }}>
                        {own ? (next ? "You're doing great — here's where you are with Leuterio Realty." : "You've completed every step. Keep the momentum going!") : where || "Leuterio Realty"}
                    </Typography>
                </Box>
                <Box sx={{ display: { xs: "none", sm: "block" }, textAlign: "right" }}>
                    <Typography sx={{ fontSize: 30, fontWeight: 700, color: "var(--lr-primary)", lineHeight: 1 }}>
                        {done}
                        <Box component="span" sx={{ fontSize: 16, fontWeight: 500, color: "var(--lr-text-secondary)" }}>
                            {" "}
                            / {milestones.length}
                        </Box>
                    </Typography>
                    <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                        milestones reached
                    </Typography>
                </Box>
            </Box>

            {/* The journey at a glance. */}
            <Box sx={{ order: { xs: 2, sm: 1 }, mt: { xs: 3, sm: 4 }, p: { xs: 2.5, sm: 3.5 }, borderRadius: 4, border: "1px solid var(--lr-border)", backgroundColor: "var(--lr-surface)", boxShadow: "var(--lr-shadow)" }}>
                <JourneyBar milestones={milestones} />
            </Box>

            {/* The invitation. */}
            {next && (
                <Box sx={{ order: { xs: 1, sm: 2 }, mt: 3 }}>
                    <NextStep next={next} name={name} own={own} naoDone={naoDone} maxFileKb={maxFileKb} />
                </Box>
            )}

            {/* Every step done: the account is active. */}
            {!next && activation && (
                <Box sx={{ order: { xs: 1, sm: 2 }, mt: 3, display: "flex", alignItems: "center", gap: { xs: 2, sm: 3 }, p: { xs: 2.5, sm: 3.5 }, borderRadius: 4, border: "1px solid var(--lr-border)", backgroundColor: "var(--lr-surface)", boxShadow: "var(--lr-shadow)" }}>
                    <SpotIcon name="trophy" size={64} />
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontWeight: 700, letterSpacing: "0.08em", color: "var(--lr-success)" }}>
                            <CheckRounded sx={{ fontSize: 16 }} /> ACTIVATION COMPLETE
                        </Typography>
                        <Typography component="h2" sx={{ fontSize: { xs: 19, sm: 22 }, fontWeight: 700, color: "var(--lr-text-primary)" }}>
                            {own ? "Your LR account is active" : `${name}'s LR account is active`}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5, color: "var(--lr-text-body)" }}>
                            Activated with {own ? "your" : "their"} first sale{activation.date ? ` on ${formatDate(activation.date)}` : ""}.{own ? " Keep closing — your team is behind you." : ""}
                        </Typography>
                    </Box>
                </Box>
            )}

            <Box sx={{ order: 3, mt: 3 }}>
                <Deferred data="certificates" fallback={<Skeleton variant="rounded" height={84} sx={{ borderRadius: 3 }} />}>
                    <Certificates data={certificates} own={own} />
                </Deferred>
            </Box>

            {agent.sponsor && (
                <Box sx={{ order: 3, mt: 3, display: "flex", alignItems: "center", gap: 1, color: "var(--lr-text-secondary)" }}>
                    <UserAvatar name={agent.sponsor.name} src={agent.sponsor.avatar} size={24} />
                    <Typography variant="caption">
                        {own ? "Your" : "Their"} sponsor, {agent.sponsor.name}, is cheering {own ? "you" : "them"} on.
                    </Typography>
                </Box>
            )}

            {/* Phones: the next step's button stays at the bottom of the screen, however far they scroll. */}
            {action && (
                <Box
                    sx={{
                        order: 4,
                        display: { xs: "flex", sm: "none" },
                        position: "sticky",
                        bottom: 0,
                        zIndex: 2,
                        mt: 3,
                        mx: -2,
                        mb: -4,
                        px: 2,
                        py: 1.5,
                        borderTop: "1px solid var(--lr-border)",
                        backgroundColor: "var(--lr-surface)",
                    }}
                >
                    <Link href={action.href} style={{ textDecoration: "none", width: "100%" }}>
                        <StyledButton variant="contained" fullWidth endIcon={<ArrowForwardRounded />} sx={primaryButton}>
                            {action.label}
                        </StyledButton>
                    </Link>
                </Box>
            )}
        </Container>
    );
}

// Its own focused page: no sidebar or menus, just the journey — with a way back to where it was opened from.
Journey.layout = (page: ReactElement<JourneyProps>) => (
    <OnboardingShell exit={page.props.own ? { href: "/dashboard/main", label: "Back to dashboard" } : { href: `/agents/${page.props.journey.agent.id}`, label: "Back to profile" }}>{page}</OnboardingShell>
);

export default Journey;
