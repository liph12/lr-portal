import { ReactNode, useEffect, useState } from "react";
import { Box, IconButton } from "@mui/material";
import { ChevronLeftRounded, ChevronRightRounded } from "@mui/icons-material";
import { Link } from "@inertiajs/react";
import { DashboardPoster } from "../../types/app-data-types";

const ADVANCE_MS = 6000;

// A poster's link: a page in the portal through Inertia, anything else in a new tab.
function PosterLink({ href, children }: { href: string | null; children: ReactNode }) {
    if (!href) return <>{children}</>;
    if (href.startsWith("/")) {
        return (
            <Link href={href} style={{ display: "block", height: "100%" }}>
                {children}
            </Link>
        );
    }
    return (
        <a href={href} target="_blank" rel="noopener" style={{ display: "block", height: "100%" }}>
            {children}
        </a>
    );
}

const arrowSx = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 1,
    width: 32,
    height: 32,
    color: "var(--lr-photo-ink)",
    backgroundColor: "var(--lr-photo-button)",
    opacity: { xs: 1, md: 0 },
    transition: "opacity 0.2s ease",
    ":hover": { backgroundColor: "var(--lr-photo-button-hover)" },
} as const;

// The dashboard's announcements (Settings › Dashboard posters): one at a time, sliding every 6 s (paused while hovered or
// when the reader asks for less motion), with arrows and dots when there's more than one.
export default function PosterCarousel({ posters }: { posters: DashboardPoster[] }) {
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const count = posters.length;
    const current = Math.min(index, Math.max(0, count - 1));

    useEffect(() => {
        if (count < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const timer = setInterval(() => setIndex((i) => (i + 1) % count), ADVANCE_MS);
        return () => clearInterval(timer);
    }, [count, paused]);

    if (!count) return null;
    const go = (step: number) => setIndex((current + step + count) % count);

    return (
        <Box
            role="region"
            aria-roledescription="carousel"
            aria-label="Announcements"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            sx={{ position: "relative", overflow: "hidden", width: "100%", aspectRatio: "1200 / 515", backgroundColor: "var(--lr-video-bg)", ":hover .poster-arrow": { opacity: 1 } }}
        >
            <Box sx={{ display: "flex", height: "100%", transform: `translateX(-${current * 100}%)`, transition: "transform 600ms ease", "@media (prefers-reduced-motion: reduce)": { transition: "none" } }}>
                {posters.map((p, i) => (
                    <Box key={p.id} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${count}: ${p.title}`} aria-hidden={i !== current} sx={{ flex: "0 0 100%", height: "100%" }}>
                        <PosterLink href={p.link_url}>
                            <Box component="img" src={p.image_url} alt={p.title} sx={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} />
                        </PosterLink>
                    </Box>
                ))}
            </Box>

            {count > 1 && (
                <>
                    <IconButton className="poster-arrow" aria-label="Previous announcement" onClick={() => go(-1)} sx={{ ...arrowSx, left: 8 }}>
                        <ChevronLeftRounded />
                    </IconButton>
                    <IconButton className="poster-arrow" aria-label="Next announcement" onClick={() => go(1)} sx={{ ...arrowSx, right: 8 }}>
                        <ChevronRightRounded />
                    </IconButton>
                    {/* In the corner on a small dark pill, so they never sit on a poster's own text. */}
                    <Box sx={{ position: "absolute", bottom: 8, right: 8, display: "flex", alignItems: "center", gap: 0.75, px: 1, py: 0.75, borderRadius: 99, zIndex: 1, backgroundColor: "var(--lr-photo-button)" }}>
                        {posters.map((p, i) => (
                            <Box
                                key={p.id}
                                component="button"
                                type="button"
                                aria-label={`Show ${p.title}`}
                                aria-current={i === current}
                                onClick={() => setIndex(i)}
                                sx={{ p: 0, border: 0, cursor: "pointer", height: 7, width: i === current ? 20 : 7, borderRadius: 99, backgroundColor: i === current ? "var(--lr-photo-ink)" : "var(--lr-photo-ink-muted)", transition: "width 200ms ease" }}
                            />
                        ))}
                    </Box>
                </>
            )}
        </Box>
    );
}
