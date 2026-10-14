import { ReactElement, ReactNode } from "react";
import { Box, Container, LinearProgress, Typography } from "@mui/material";
import { ArrowForwardRounded, CheckRounded, HourglassTopRounded } from "@mui/icons-material";
import { Link } from "@inertiajs/react";
import OnboardingShell from "../../../components/layouts/OnboardingShell";
import StyledButton from "../../../components/utils/StyledButton";
import FireLogo from "../../../components/fire/FireLogo";
import SpotIcon, { SpotName } from "../../../components/utils/SpotIcon";
import UserAvatar from "../../../components/utils/user/UserAvatar";
import { formatDate } from "../../../helpers/formatDate";

type Status = "done" | "current" | "waiting" | "upcoming";

interface Milestone {
    key: "registered" | "photo" | "nao" | "fire" | "first_sale";
    title: string;
    status: Status;
    date: string | null;
    detail: string;
    certificates?: number;
    of?: number;
}

interface JourneyProps {
    journey: {
        agent: { id: number; name: string; first_name: string; avatar: string | null; branch: string | null; team: string | null; sub_team: string | null; sponsor: { name: string; avatar: string | null } | null };
        milestones: Milestone[];
        done: number;
    };
    // The reader's own journey: speak to them ("you"), and offer the next step.
    own: boolean;
}

// Short names for the journey bar.
const LABELS: Record<Milestone["key"], string> = { registered: "Registered", photo: "Profile photo", nao: "NAO", fire: "FIRE", first_sale: "First sale" };

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
                                {m.status === "done" ? (m.date ? formatDate(m.date) : "Done") : m.status === "waiting" ? "Waiting for approval" : active ? "Next up" : "Later"}
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
        case "first_sale":
            return { href: "/dashboard/record-sale", label: "Record a sale" };
        default:
            return null;
    }
}

// The next step, as an invitation: FIRE gets its own logo and a warm word; the others a short nudge.
function NextStep({ next, name, own, naoDone }: { next: Milestone; name: string; own: boolean; naoDone: boolean }) {
    const card = (art: ReactNode, title: string, text: string, action?: ReactNode, extra?: ReactNode) => (
        <Box
            sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                alignItems: { md: "center" },
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
    if (next.key === "registered") return null;
    const steps: Record<"photo" | "nao" | "first_sale", [SpotName, string, string]> = {
        photo: ["team", "Add your profile photo", "A clear, friendly photo helps clients and your team recognise you — on your profile and your business card."],
        nao: ["graduation", next.status === "waiting" ? "Your NAO is being reviewed" : "Complete your NAO", next.detail],
        first_sale: ["trophy", "Go for your first sale", "Training done — now it's time to close. Record your first sale and your team will celebrate it with you."],
    };
    const [art, title, text] = steps[next.key];
    return card(<SpotIcon name={art} size={72} />, title, text, go ?? undefined);
}

// An agent's onboarding journey, as a page of its own: a greeting, the journey at a glance, and an invitation to the next step
// (FIRE once the NAO is done). Opened from the NAO step, the profile menu ("My journey") or an agent's profile.
function Journey({ journey, own }: JourneyProps) {
    const { agent, milestones, done } = journey;
    const name = agent.first_name || agent.name;
    const next = milestones.find((m) => m.status !== "done");
    const naoDone = milestones.find((m) => m.key === "nao")?.status === "done";
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
                    <NextStep next={next} name={name} own={own} naoDone={naoDone} />
                </Box>
            )}

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
