import { useEffect, useState } from "react";
import { Box, Grid, Typography } from "@mui/material";
import { ArrowForwardRounded } from "@mui/icons-material";
import { Link, router } from "@inertiajs/react";
import OnboardingShell from "../../../components/layouts/OnboardingShell";
import StyledButton from "../../../components/utils/StyledButton";
import useAuthUser from "../../../hooks/useAuthUser";
import NATCON_2025 from "../../../../assets/onboarding/natcon2025.jpg";
import NATCON_2024 from "../../../../assets/onboarding/natcon2024.jpg";
import NATCON_2023 from "../../../../assets/onboarding/natcon2023.jpg";
import RENTPH_LOGO from "../../../../assets/onboarding/rentph-logo-white.png";
import LR_LOGO from "../../../../assets/onboarding/lr-logo-white.png";
import FH_LOGO from "../../../../assets/onboarding/fh-logo-white.png";

const SLIDES = [
    { src: NATCON_2025, alt: "NATCON 2025" },
    { src: NATCON_2024, alt: "NATCON 2024" },
    { src: NATCON_2023, alt: "NATCON 2023" },
];
const LOGOS = [
    { src: RENTPH_LOGO, alt: "Rent.ph" },
    { src: LR_LOGO, alt: "Leuterio Realty & Brokerage" },
    { src: FH_LOGO, alt: "Filipino Homes" },
];
// The old welcome page's pace: a photo every 4.5 s, a logo every 2.8 s.
const SLIDE_MS = 4500;
const LOGO_MS = 2800;
const FADE_MS = 420;

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Advances an index on a timer; frozen when the reader asked for less motion.
function useCycle(length: number, ms: number) {
    const [index, setIndex] = useState(0);
    useEffect(() => {
        if (reducedMotion()) return;
        const timer = setInterval(() => setIndex((i) => (i + 1) % length), ms);
        return () => clearInterval(timer);
    }, [length, ms]);
    return [index, setIndex] as const;
}

// The first thing a new agent sees (the dashboard sends them here until onboarding is done): a welcome beside the NATCON
// photos and the three brands, then Get Started → their profile photo. "Skip for now" lets them in for this session.
function Welcome() {
    const firstName = useAuthUser()?.first_name;
    const [slide, setSlide] = useCycle(SLIDES.length, SLIDE_MS);
    const [logo] = useCycle(LOGOS.length, LOGO_MS);
    const [logoShown, setLogoShown] = useState(logo);
    const [logoVisible, setLogoVisible] = useState(true);

    // Fade the old logo out before the next one fades in.
    useEffect(() => {
        if (logo === logoShown) return;
        setLogoVisible(false);
        const timer = setTimeout(() => {
            setLogoShown(logo);
            setLogoVisible(true);
        }, FADE_MS);
        return () => clearTimeout(timer);
    }, [logo, logoShown]);

    return (
        <OnboardingShell>
            <Grid container spacing={{ xs: 4, md: 6 }} sx={{ alignItems: "center" }}>
                <Grid size={{ xs: 12, md: 5 }}>
                    <Box
                        component="span"
                        sx={{ display: "inline-flex", px: 1.5, py: 0.5, borderRadius: 99, fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", color: "var(--lr-primary)", backgroundColor: "var(--lr-primary-soft)" }}
                    >
                        YOUR JOURNEY
                    </Box>
                    <Typography component="h1" sx={{ mt: 2, fontSize: { xs: 34, sm: 44 }, fontWeight: 400, lineHeight: 1.1, color: "var(--lr-text-primary)" }}>
                        Welcome{firstName ? `, ${firstName}` : ""}, to
                        <Box component="span" sx={{ display: "block", fontWeight: 600, color: "var(--lr-primary)" }}>
                            Leuterio Realty Portal
                        </Box>
                    </Typography>
                    {/* The accent line under the title, from the old welcome page. */}
                    <Box sx={{ mt: 2.5, width: 96, height: 4, borderRadius: 99, background: "linear-gradient(90deg, var(--lr-primary), var(--lr-warning))" }} />
                    <Typography sx={{ mt: 2.5, fontSize: 17, lineHeight: 1.7, color: "var(--lr-text-body)", maxWidth: 560 }}>
                        Congratulations! You've successfully accessed the Leuterio Realty Portal. We're excited to support you on your real estate journey and help you
                        achieve your dreams.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1.5, color: "var(--lr-text-secondary)", maxWidth: 560 }}>
                        Let's start with your profile photo — it's how clients and your team will recognise you.
                    </Typography>
                    <Box sx={{ mt: 4, display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
                        <Link href="/welcome/photo" style={{ textDecoration: "none" }}>
                            <StyledButton
                                variant="contained"
                                size="large"
                                endIcon={<ArrowForwardRounded />}
                                sx={{ px: 4, py: 1.25, fontSize: 16, backgroundColor: "var(--lr-primary)", color: "var(--lr-on-primary)", ":hover": { backgroundColor: "var(--lr-primary-hover)" } }}
                            >
                                Get Started
                            </StyledButton>
                        </Link>
                        <StyledButton onClick={() => router.post("/welcome/skip")} sx={{ color: "var(--lr-text-secondary)" }}>
                            Skip for now
                        </StyledButton>
                    </Box>
                </Grid>

                <Grid size={{ xs: 12, md: 7 }}>
                    <Box sx={{ position: "relative", height: { xs: 260, sm: 340, md: 440 }, borderRadius: 4, overflow: "hidden", backgroundColor: "var(--lr-surface-container)" }}>
                        <Box sx={{ display: "flex", height: "100%", transform: `translateX(-${slide * 100}%)`, transition: "transform 700ms ease", "@media (prefers-reduced-motion: reduce)": { transition: "none" } }}>
                            {SLIDES.map((s, i) => (
                                <Box key={s.src} component="img" src={s.src} alt={s.alt} aria-hidden={i !== slide} sx={{ flex: "0 0 100%", width: "100%", height: "100%", objectFit: "cover" }} />
                            ))}
                        </Box>
                        {/* The logos are white: they sit on a dark wash over the photo in light and dark mode alike. */}
                        <Box sx={{ position: "absolute", inset: 0, background: "var(--lr-photo-scrim)", pointerEvents: "none" }} />
                        <Box sx={{ position: "absolute", left: { xs: 16, sm: 24 }, right: { xs: 16, sm: 24 }, bottom: { xs: 14, sm: 20 }, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2 }}>
                            <Box
                                component="img"
                                src={LOGOS[logoShown].src}
                                alt={LOGOS[logoShown].alt}
                                sx={{ height: { xs: 44, sm: 60 }, maxWidth: { xs: 160, sm: 220 }, objectFit: "contain", objectPosition: "left bottom", opacity: logoVisible ? 1 : 0, transition: `opacity ${FADE_MS}ms ease` }}
                            />
                            <Box sx={{ display: "flex", gap: 0.75, pb: 0.5 }}>
                                {SLIDES.map((s, i) => (
                                    <Box
                                        key={s.src}
                                        component="button"
                                        type="button"
                                        aria-label={`Show ${s.alt}`}
                                        aria-current={i === slide}
                                        onClick={() => setSlide(i)}
                                        sx={{ p: 0, border: 0, cursor: "pointer", height: 8, width: i === slide ? 22 : 8, borderRadius: 99, backgroundColor: i === slide ? "var(--lr-photo-ink)" : "var(--lr-photo-ink-muted)", transition: "width 200ms ease" }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    </Box>
                </Grid>
            </Grid>
        </OnboardingShell>
    );
}

export default Welcome;
