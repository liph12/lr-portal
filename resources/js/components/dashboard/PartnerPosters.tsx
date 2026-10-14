import { ElementType, useEffect, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { KeyRounded, LocationOnRounded, OpenInNewRounded } from "@mui/icons-material";
import FH_LOGO from "../../../assets/onboarding/fh-logo-white.png";
import RENTPH_LOGO from "../../../assets/rentph-logo-tagline.png";

interface Poster {
    logo: string;
    // A light panel behind the logo (Rent.ph's blue lettering needs it on the navy).
    logoBackdrop?: string;
    brand: string;
    headline: string;
    cta: string;
    url: string;
    background: string;
    accent: string;
    onAccent: string;
    // The brand's shape, large and cropped at the right: the poster's picture.
    Art: ElementType;
}

const POSTERS: Poster[] = [
    {
        logo: FH_LOGO,
        brand: "Filipino Homes",
        headline: "Selling a property? Post it on Filipino Homes.",
        cta: "Post a brokerage property",
        url: "https://filipinohomes.com",
        background: "var(--lr-brand-fh-bg)",
        accent: "var(--lr-brand-fh-accent)",
        onAccent: "var(--lr-brand-ink)",
        Art: LocationOnRounded,
    },
    {
        logo: RENTPH_LOGO,
        logoBackdrop: "var(--lr-brand-rentph-logo-bg)",
        brand: "Rent.ph",
        headline: "Have a place for rent? List it on Rent.ph.",
        cta: "Post a rental property",
        url: "https://rent.ph",
        background: "var(--lr-brand-rentph-bg)",
        accent: "var(--lr-brand-rentph-accent)",
        onAccent: "var(--lr-brand-rentph-on-accent)",
        Art: KeyRounded,
    },
];

// Phones show one poster at a time.
const ROTATE_MS = 6000;

function Strip({ logo, logoBackdrop, brand, headline, cta, url, background, accent, onAccent, Art }: Poster) {
    return (
        <Box
            component="section"
            aria-label={`${brand}: ${cta}`}
            sx={{
                position: "relative",
                overflow: "hidden",
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: { xs: 1.5, sm: 2 },
                pl: { xs: 2, sm: 2.5 },
                // Room at the right for the brand shape, so it never sits behind the button.
                pr: { xs: 2, sm: 9 },
                py: 1,
                minHeight: 56,
                color: "var(--lr-brand-ink)",
                background,
            }}
        >
            <Art aria-hidden sx={{ display: { xs: "none", sm: "block" }, position: "absolute", right: -6, bottom: -22, fontSize: 84, color: accent, opacity: 0.9, transform: "rotate(-12deg)" }} />
            {logoBackdrop ? (
                // From the poster's left edge to a slanted end, the full height of the strip.
                <Box
                    sx={{
                        alignSelf: "stretch",
                        my: -1,
                        ml: { xs: -2, sm: -2.5 },
                        pl: { xs: 2, sm: 2.5 },
                        pr: 3.5,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        position: "relative",
                        backgroundColor: logoBackdrop,
                        clipPath: "polygon(0 0, 100% 0, calc(100% - 18px) 100%, 0 100%)",
                    }}
                >
                    <Box component="img" src={logo} alt={brand} sx={{ height: 36, width: { xs: 98, sm: 118 }, objectFit: "contain", objectPosition: "left" }} />
                </Box>
            ) : (
                <Box component="img" src={logo} alt={brand} sx={{ height: 36, width: { xs: 98, sm: 118 }, flexShrink: 0, objectFit: "contain", objectPosition: "left", position: "relative" }} />
            )}
            {/* Only where two side-by-side posters leave room for it (or one alone on a tablet); never more than two lines. */}
            <Typography
                variant="body2"
                sx={{
                    flex: 1,
                    minWidth: 0,
                    fontWeight: 600,
                    lineHeight: 1.3,
                    position: "relative",
                    display: { xs: "none", sm: "-webkit-box", md: "none", lg: "-webkit-box" },
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                }}
            >
                {headline}
            </Typography>
            <Button
                href={url}
                target="_blank"
                rel="noopener"
                size="small"
                variant="contained"
                endIcon={<OpenInNewRounded sx={{ fontSize: "16px !important" }} />}
                sx={{ ml: { xs: "auto", sm: 0, md: "auto", lg: 0 }, flexShrink: 0, whiteSpace: "nowrap", borderRadius: 99, px: 1.75, position: "relative", backgroundColor: accent, color: onAccent, ":hover": { backgroundColor: accent, filter: "brightness(1.08)" } }}
            >
                {cta}
            </Button>
        </Box>
    );
}

// Partner posters on every signed-in page (AppLayout, under the navbar): Filipino Homes for brokerage listings, Rent.ph for
// rentals — side by side, one at a time on phones. External sites, so they open in a new tab.
export default function PartnerPosters() {
    const [shown, setShown] = useState(0);
    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const timer = setInterval(() => setShown((i) => (i + 1) % POSTERS.length), ROTATE_MS);
        return () => clearInterval(timer);
    }, []);

    return (
        <Box sx={{ flexShrink: 0, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, borderBottom: "1px solid var(--lr-border)" }}>
            {POSTERS.map((p, i) => (
                <Box key={p.brand} sx={{ minWidth: 0, display: { xs: i === shown ? "block" : "none", md: "block" } }}>
                    <Strip {...p} />
                </Box>
            ))}
        </Box>
    );
}
