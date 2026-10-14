import { ReactElement, useState } from "react";
import { Box, ButtonBase, LinearProgress, Typography } from "@mui/material";
import { ArrowBackRounded, ArrowForwardRounded, CancelRounded, CheckCircleRounded, ReplayRounded } from "@mui/icons-material";
import { Link, router, useForm } from "@inertiajs/react";
import OnboardingShell from "../../../components/layouts/OnboardingShell";
import StyledButton from "../../../components/utils/StyledButton";
import SpotIcon from "../../../components/utils/SpotIcon";
import ModuleLogo from "../../../components/fire/ModuleLogo";
import { FireModule, FireQuestion, FireResult } from "../../../types/app-data-types";

interface FireExamProps {
    module: FireModule;
    questions: FireQuestion[];
    next: number | null;
    passScore: number;
    // Just graded (flashed once after submitting).
    result: FireResult | null;
}

const primary = { backgroundColor: "var(--lr-primary)", color: "var(--lr-on-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" }, "&.Mui-disabled": { backgroundColor: "var(--lr-surface-container)", color: "var(--lr-text-secondary)" } };

function Result({ module, result, next, passScore }: { module: FireModule; result: FireResult; next: number | null; passScore: number }) {
    return (
        <Box sx={{ textAlign: "center", maxWidth: 640, mx: "auto" }}>
            <Box sx={{ display: "flex", justifyContent: "center" }}>
                <SpotIcon name={result.passed ? "trophy" : "chart-up"} size={88} />
            </Box>
            <Typography component="h1" sx={{ mt: 2, fontSize: { xs: 26, sm: 32 }, fontWeight: 700, color: result.passed ? "var(--lr-success)" : "var(--lr-text-primary)" }}>
                {result.passed ? "You passed!" : "Not quite yet"}
            </Typography>
            <Typography sx={{ mt: 0.5, color: "var(--lr-text-secondary)" }}>
                {module.title}: <strong>{result.score}</strong> of {result.total} correct{result.passed ? "" : ` — ${passScore} passes. Review the video and slides, then try again.`}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: "var(--lr-text-secondary)" }}>
                FIRE modules passed so far: {result.total_passed}
            </Typography>

            <Box sx={{ mt: 3, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))", gap: 1, textAlign: "left" }}>
                {result.results.map((r) => (
                    <Box key={r.position} sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1.25, py: 0.75, borderRadius: 2, backgroundColor: r.correct ? "var(--lr-success-soft)" : "var(--lr-error-soft)" }}>
                        {r.correct ? <CheckCircleRounded sx={{ fontSize: 18, color: "var(--lr-success)" }} /> : <CancelRounded sx={{ fontSize: 18, color: "var(--lr-error)" }} />}
                        <Typography variant="body2" sx={{ color: "var(--lr-text-body)" }}>
                            Q{r.position}
                        </Typography>
                    </Box>
                ))}
            </Box>

            <Box sx={{ mt: 3.5, display: "flex", justifyContent: "center", gap: 1.5, flexWrap: "wrap" }}>
                <StyledButton variant="outlined" startIcon={<ReplayRounded />} onClick={() => router.visit(`/fire/${module.id}/exam`)} sx={{ color: "var(--lr-primary)", borderColor: "var(--lr-outline)" }}>
                    Retake
                </StyledButton>
                {result.passed && next ? (
                    <Link href={`/fire/${next}`} style={{ textDecoration: "none" }}>
                        <StyledButton variant="contained" endIcon={<ArrowForwardRounded />} sx={primary}>
                            Next module
                        </StyledButton>
                    </Link>
                ) : (
                    <Link href="/fire" style={{ textDecoration: "none" }}>
                        <StyledButton variant="contained" sx={primary}>
                            All modules
                        </StyledButton>
                    </Link>
                )}
            </Box>
        </Box>
    );
}

// A FIRE module's exam: one question at a time (in a new order each attempt), A–D, then the training site grades it.
function FireExam({ module, questions, next, passScore, result }: FireExamProps) {
    const [step, setStep] = useState(0);
    const form = useForm<{ answers: { question: number; answer: string }[] }>({ answers: [] });
    const picked = (n: number) => form.data.answers.find((a) => a.question === n)?.answer;
    const pick = (n: number, value: string) => form.setData("answers", [...form.data.answers.filter((a) => a.question !== n), { question: n, answer: value }]);

    if (result) return <Result module={module} result={result} next={next} passScore={passScore} />;
    if (!questions.length) {
        return (
            <Box sx={{ textAlign: "center", py: 6 }}>
                <Typography sx={{ color: "var(--lr-text-secondary)" }}>This module's exam isn't available yet.</Typography>
                <Link href={`/fire/${module.id}`} style={{ textDecoration: "none" }}>
                    <StyledButton sx={{ mt: 2, color: "var(--lr-primary)" }}>Back to the module</StyledButton>
                </Link>
            </Box>
        );
    }

    // In the order shown, so the results number the questions as the agent saw them.
    const submit = () => {
        form.transform((d) => ({ answers: questions.map((x) => d.answers.find((a) => a.question === x.number)).filter(Boolean) }));
        form.post(`/fire/${module.id}/exam`, { preserveScroll: true });
    };

    const q = questions[step];
    const last = step === questions.length - 1;
    const answered = form.data.answers.length;

    return (
        <Box sx={{ maxWidth: 720, mx: "auto" }}>
            <Link href={`/fire/${module.id}`} style={{ textDecoration: "none" }}>
                <StyledButton size="small" startIcon={<ArrowBackRounded />} sx={{ mb: 1, px: 1, color: "var(--lr-primary)" }}>
                    {module.title}
                </StyledButton>
            </Link>
            <ModuleLogo module={module} width={170} sx={{ mb: 2 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: "0.12em", color: "var(--lr-accent-ink)" }}>
                    EXAM · QUESTION {step + 1} OF {questions.length}
                </Typography>
                <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                    {answered} answered
                </Typography>
            </Box>
            <LinearProgress
                variant="determinate"
                value={((step + 1) * 100) / questions.length}
                aria-label="Exam progress"
                sx={{ mt: 1, height: 6, borderRadius: 99, backgroundColor: "var(--lr-surface-container)", "& .MuiLinearProgress-bar": { backgroundColor: "var(--lr-primary)", borderRadius: 99 } }}
            />

            <Typography component="h1" sx={{ mt: 3, fontSize: { xs: 19, sm: 22 }, fontWeight: 600, lineHeight: 1.45, color: "var(--lr-text-primary)" }}>
                {q.question}
            </Typography>
            <Box role="radiogroup" aria-label={`Question ${q.number}`} sx={{ mt: 2.5, display: "flex", flexDirection: "column", gap: 1.25 }}>
                {q.choices.map((c) => {
                    const selected = picked(q.number) === c.value;
                    return (
                        <ButtonBase
                            key={c.value}
                            role="radio"
                            aria-checked={selected}
                            onClick={() => pick(q.number, c.value)}
                            sx={{
                                justifyContent: "flex-start",
                                textAlign: "left",
                                gap: 1.5,
                                p: 1.75,
                                borderRadius: 2.5,
                                border: "1.5px solid",
                                borderColor: selected ? "var(--lr-primary)" : "var(--lr-border)",
                                backgroundColor: selected ? "var(--lr-primary-soft)" : "var(--lr-surface)",
                                transition: "border-color 0.15s ease, background-color 0.15s ease",
                                ":hover": { borderColor: "var(--lr-primary)" },
                                ":focus-visible": { outline: "2px solid var(--lr-primary)", outlineOffset: 2 },
                            }}
                        >
                            <Box sx={{ width: 30, height: 30, flexShrink: 0, borderRadius: 1.5, display: "grid", placeItems: "center", fontWeight: 700, fontSize: 14, color: selected ? "var(--lr-on-primary)" : "var(--lr-primary)", backgroundColor: selected ? "var(--lr-primary)" : "var(--lr-primary-soft)" }}>
                                {c.value}
                            </Box>
                            <Typography sx={{ color: "var(--lr-text-body)", fontSize: 15 }}>{c.text}</Typography>
                        </ButtonBase>
                    );
                })}
            </Box>

            {form.errors.answers && (
                <Typography variant="body2" sx={{ mt: 2, color: "var(--lr-error)" }}>
                    {form.errors.answers}
                </Typography>
            )}
            <Box sx={{ mt: 3.5, display: "flex", justifyContent: "space-between", gap: 1.5 }}>
                <StyledButton startIcon={<ArrowBackRounded />} disabled={step === 0} onClick={() => setStep(step - 1)} sx={{ color: "var(--lr-primary)" }}>
                    Previous
                </StyledButton>
                {last ? (
                    <StyledButton variant="contained" loading={form.processing} disabled={answered < questions.length} onClick={submit} sx={{ ...primary, px: 3 }}>
                        {answered < questions.length ? `Answer all ${questions.length} to submit` : "Submit answers"}
                    </StyledButton>
                ) : (
                    <StyledButton variant="contained" endIcon={<ArrowForwardRounded />} disabled={!picked(q.number)} onClick={() => setStep(step + 1)} sx={{ ...primary, px: 3 }}>
                        Next
                    </StyledButton>
                )}
            </Box>
        </Box>
    );
}

FireExam.layout = (page: ReactElement) => <OnboardingShell exit={{ href: "/fire", label: "All modules" }}>{page}</OnboardingShell>;

export default FireExam;
