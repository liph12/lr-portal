import { ReactElement } from "react";
import { Box, Typography } from "@mui/material";
import { ArrowBackRounded, ArrowForwardRounded, CheckCircleRounded, DescriptionOutlined, OpenInNewRounded } from "@mui/icons-material";
import { Link } from "@inertiajs/react";
import OnboardingShell from "../../../components/layouts/OnboardingShell";
import StyledButton from "../../../components/utils/StyledButton";
import UserAvatar from "../../../components/utils/user/UserAvatar";
import ModuleLogo from "../../../components/fire/ModuleLogo";
import { FireModule, FireQuestion } from "../../../types/app-data-types";

interface FireModuleProps {
    module: FireModule;
    questions: FireQuestion[];
    next: number | null;
    passScore: number;
}

// A training video: YouTube's player, or the site's own file.
function Video({ src, kind, title }: { src: string; kind: "youtube" | "file"; title: string }) {
    return (
        <Box sx={{ position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: 3, overflow: "hidden", backgroundColor: "var(--lr-video-bg)" }}>
            {kind === "youtube" ? (
                <Box component="iframe" src={`${src}${src.includes("?") ? "&" : "?"}rel=0&modestbranding=1`} title={title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
            ) : (
                <Box component="video" src={src} controls preload="metadata" sx={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
            )}
        </Box>
    );
}

const primary = { backgroundColor: "var(--lr-primary)", color: "var(--lr-on-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } };

// One FIRE module: its video, what it covers, its slides, and the way to its exam (open any time — the video can be skipped).
function FireModulePage({ module, questions, next, passScore }: FireModuleProps) {
    const hasExam = questions.length > 0;

    return (
        <Box sx={{ maxWidth: 960, mx: "auto" }}>
            <Link href="/fire" style={{ textDecoration: "none" }}>
                <StyledButton size="small" startIcon={<ArrowBackRounded />} sx={{ mb: 1, px: 1, color: "var(--lr-primary)" }}>
                    All modules
                </StyledButton>
            </Link>
            <ModuleLogo module={module} width={200} sx={{ mb: 1.5 }} />
            <Typography component="h1" sx={{ fontSize: { xs: 24, sm: 30 }, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--lr-text-primary)" }}>
                {module.title}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, mb: 2.5, color: "var(--lr-text-secondary)" }}>
                {module.description}
            </Typography>

            {(module.videos ?? (module.video ? [{ title: "", ...module.video }] : [])).map((v) => (
                <Box key={v.src} sx={{ mb: 2.5 }}>
                    {v.title && <Typography sx={{ fontWeight: 600, color: "var(--lr-text-primary)", mb: 1 }}>{v.title}</Typography>}
                    <Video src={v.src} kind={v.kind} title={v.title || module.title} />
                </Box>
            ))}

            <Box sx={{ mt: 3, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 300px" }, gap: 3, alignItems: "start" }}>
                <Box>
                    {module.learning.length > 0 && (
                        <>
                            <Typography sx={{ fontWeight: 600, color: "var(--lr-text-primary)", mb: 1 }}>What you'll learn</Typography>
                            <Box component="ul" sx={{ m: 0, pl: 2.5, display: "flex", flexDirection: "column", gap: 0.75, color: "var(--lr-text-body)" }}>
                                {module.learning.map((l, i) => (
                                    <Typography component="li" variant="body2" key={i} sx={{ lineHeight: 1.6 }}>
                                        {l}
                                    </Typography>
                                ))}
                            </Box>
                        </>
                    )}
                    {module.slides && (
                        <StyledButton component="a" href={module.slides} target="_blank" rel="noopener" variant="outlined" startIcon={<DescriptionOutlined />} endIcon={<OpenInNewRounded />} sx={{ mt: 2.5, color: "var(--lr-primary)", borderColor: "var(--lr-outline)" }}>
                            Open the slides
                        </StyledButton>
                    )}
                </Box>

                <Box sx={{ p: 2.5, borderRadius: 3, border: "1px solid var(--lr-border)", backgroundColor: "var(--lr-surface)" }}>
                    {module.speaker && (
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 1, mb: 2.5 }}>
                            <Box sx={{ borderRadius: "50%", border: "3px solid var(--lr-primary-soft-strong)" }}>
                                <UserAvatar name={module.speaker.name} src={module.speaker.avatar} size={96} />
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                                    Speaker
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--lr-text-primary)" }}>
                                    {module.speaker.name}
                                </Typography>
                            </Box>
                        </Box>
                    )}
                    {module.passed ? (
                        <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 0.75, fontWeight: 600, color: "var(--lr-success)", mb: 1.5 }}>
                            <CheckCircleRounded fontSize="small" /> Passed{module.best_score !== null && ` · ${module.best_score}/${questions.length || 10}`}
                        </Typography>
                    ) : (
                        <Typography variant="body2" sx={{ color: "var(--lr-text-secondary)", mb: 1.5 }}>
                            {hasExam ? `${questions.length} questions — ${passScore} correct passes.` : "This module's exam isn't available yet."}
                            {module.best_score !== null && ` Your best so far: ${module.best_score}/${questions.length || 10}.`}
                        </Typography>
                    )}
                    {hasExam ? (
                        <Link href={`/fire/${module.id}/exam`} style={{ textDecoration: "none" }}>
                            <StyledButton variant="contained" fullWidth endIcon={<ArrowForwardRounded />} sx={primary}>
                                {module.passed ? "Retake the exam" : "Take the exam"}
                            </StyledButton>
                        </Link>
                    ) : (
                        <StyledButton variant="contained" fullWidth disabled>
                            Exam coming soon
                        </StyledButton>
                    )}
                    {next && (
                        <Link href={`/fire/${next}`} style={{ textDecoration: "none" }}>
                            <StyledButton fullWidth endIcon={<ArrowForwardRounded />} sx={{ mt: 1, color: "var(--lr-primary)" }}>
                                Next module
                            </StyledButton>
                        </Link>
                    )}
                </Box>
            </Box>
        </Box>
    );
}

FireModulePage.layout = (page: ReactElement) => <OnboardingShell exit={{ href: "/my-journey", label: "My journey" }}>{page}</OnboardingShell>;

export default FireModulePage;
