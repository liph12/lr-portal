import { ReactElement } from "react";
import { Alert, Box, Grid, LinearProgress, Typography } from "@mui/material";
import { CheckCircleRounded, ChevronRightRounded, PlayCircleOutlineRounded } from "@mui/icons-material";
import { Link } from "@inertiajs/react";
import OnboardingShell from "../../../components/layouts/OnboardingShell";
import FireLogo from "../../../components/fire/FireLogo";
import ModuleLogo from "../../../components/fire/ModuleLogo";
import UserAvatar from "../../../components/utils/user/UserAvatar";
import { FireModule } from "../../../types/app-data-types";

interface FireIndexProps {
    modules: FireModule[];
    // The training site wants an endorsement letter before this account may start.
    endorsement: boolean;
    error: string | null;
    passScore: number;
}

// FIRE (Filipinohomes Institute of Real Estate): the modules from realestatetraining.ph, how far the agent is, and each module's status (best score of 10).
function FireIndex({ modules, endorsement, error, passScore }: FireIndexProps) {
    const passed = modules.filter((m) => m.passed).length;
    const next = modules.find((m) => !m.passed);

    return (
        <Box sx={{ maxWidth: 1000, mx: "auto" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, flexWrap: "wrap" }}>
                <Box sx={{ flex: 1, minWidth: 220 }}>
                    <FireLogo sx={{ width: { xs: 240, sm: 300 }, mb: 2 }} />
                    <Typography component="h1" sx={{ fontSize: { xs: 26, sm: 32 }, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--lr-text-primary)", lineHeight: 1.15 }}>
                        Build the skills top agents use
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.75, color: "var(--lr-text-secondary)", maxWidth: 620 }}>
                        Watch each module's video, go through its slides, then take the exam — {passScore} of 10 passes it. You can take the exam any time, and retake it.
                    </Typography>
                </Box>
                {modules.length > 0 && (
                    <Box sx={{ minWidth: 180 }}>
                        <Typography sx={{ fontSize: 28, fontWeight: 700, color: "var(--lr-primary)", lineHeight: 1 }}>
                            {passed}
                            <Box component="span" sx={{ fontSize: 16, color: "var(--lr-text-secondary)", fontWeight: 500 }}>
                                {" "}
                                / {modules.length} passed
                            </Box>
                        </Typography>
                        <LinearProgress
                            variant="determinate"
                            value={(passed * 100) / modules.length}
                            aria-label="FIRE progress"
                            sx={{ mt: 1, height: 8, borderRadius: 99, backgroundColor: "var(--lr-surface-container)", "& .MuiLinearProgress-bar": { backgroundColor: "var(--lr-primary)", borderRadius: 99 } }}
                        />
                    </Box>
                )}
            </Box>

            {error && (
                <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                    {error}
                </Alert>
            )}
            {endorsement && (
                <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                    Your FIRE account needs an endorsement letter before you can start. Please ask your sponsor or your branch office for one.
                </Alert>
            )}

            <Grid container spacing={2}>
                {modules.map((m, i) => {
                    const isNext = m.id === next?.id;
                    return (
                        <Grid key={m.id} size={{ xs: 12, sm: 6 }}>
                            <Link href={`/fire/${m.id}`} style={{ textDecoration: "none", display: "block", height: "100%" }}>
                                <Box
                                    sx={{
                                        height: "100%",
                                        display: "flex",
                                        gap: 2,
                                        alignItems: "flex-start",
                                        p: 2.25,
                                        borderRadius: 3,
                                        border: "1px solid",
                                        borderColor: isNext ? "var(--lr-primary)" : "var(--lr-border)",
                                        backgroundColor: isNext ? "var(--lr-primary-soft)" : "var(--lr-surface)",
                                        transition: "border-color 0.15s ease",
                                        ":hover": { borderColor: "var(--lr-primary)" },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            flexShrink: 0,
                                            borderRadius: "28%",
                                            display: "grid",
                                            placeItems: "center",
                                            fontWeight: 700,
                                            color: m.passed ? "var(--lr-on-primary)" : "var(--lr-primary)",
                                            backgroundColor: m.passed ? "var(--lr-success-icon)" : "var(--lr-primary-soft-strong)",
                                        }}
                                    >
                                        {m.passed ? <CheckCircleRounded /> : i + 1}
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)", fontWeight: 600 }}>
                                            Module {i + 1}
                                            {isNext && (
                                                <Box component="span" sx={{ ml: 1, px: 0.75, borderRadius: 99, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "var(--lr-on-accent)", backgroundColor: "var(--lr-accent)" }}>
                                                    NEXT UP
                                                </Box>
                                            )}
                                        </Typography>
                                        <Typography sx={{ fontWeight: 600, color: "var(--lr-text-primary)", lineHeight: 1.35 }}>{m.title}</Typography>
                                        <Typography variant="body2" sx={{ mt: 0.5, color: "var(--lr-text-secondary)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                            {m.description}
                                        </Typography>
                                        {m.brand === "rentph" && <ModuleLogo module={m} width={150} sx={{ mt: 1.25 }} />}
                                        {m.speaker && (
                                            <Box sx={{ mt: 1.25, display: "flex", alignItems: "center", gap: 1 }}>
                                                <UserAvatar name={m.speaker.name} src={m.speaker.avatar} size={30} />
                                                <Typography variant="caption" sx={{ color: "var(--lr-text-body)", fontWeight: 500, lineHeight: 1.3 }}>
                                                    {m.speaker.name}
                                                </Typography>
                                            </Box>
                                        )}
                                        <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                            {m.passed ? (
                                                <Typography variant="caption" sx={{ fontWeight: 600, color: "var(--lr-success)" }}>
                                                    Passed{m.best_score !== null && m.brand !== "rentph" ? ` · ${m.best_score}/10` : ""}{m.taken_on ? ` · ${m.taken_on}` : ""}
                                                </Typography>
                                            ) : m.best_score !== null ? (
                                                <Typography variant="caption" sx={{ fontWeight: 600, color: "var(--lr-warning)" }}>
                                                    Best so far {m.best_score}/10 — retake to pass
                                                </Typography>
                                            ) : (
                                                <Typography variant="caption" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "var(--lr-text-secondary)" }}>
                                                    <PlayCircleOutlineRounded sx={{ fontSize: 15 }} /> Not started
                                                </Typography>
                                            )}

                                        </Box>
                                    </Box>
                                    <ChevronRightRounded sx={{ color: "var(--lr-text-secondary)", alignSelf: "center" }} />
                                </Box>
                            </Link>
                        </Grid>
                    );
                })}
            </Grid>
        </Box>
    );
}

// A focused page like the journey it's reached from.
FireIndex.layout = (page: ReactElement) => <OnboardingShell exit={{ href: "/my-journey", label: "My journey" }}>{page}</OnboardingShell>;

export default FireIndex;
