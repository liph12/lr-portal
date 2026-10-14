import { Box } from "@mui/material";

// Official marks drawn to fill a round badge, so the badge itself is the logo.
// Each one inherits the badge's text colour and needs the badge to be
// `position: relative; overflow: hidden`.
const fillBadgeSx = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    fill: "currentColor",
    pointerEvents: "none",
} as const;

// Facebook's "f" runs off the bottom edge of the circle, like the real logo.
export function FacebookGlyph() {
    return (
        <Box
            component="svg"
            viewBox="0 0 1024 1024"
            aria-hidden="true"
            sx={fillBadgeSx}
        >
            <path d="M711.3 660l22.7-148H592v-96.043c0-40.49 19.838-79.957 83.438-79.957H740V210s-58.593-10-114.61-10C508.438 200 432 270.88 432 399.2V512H302v148h130v357.78c26.067 4.09 52.784 6.22 80 6.22s53.933-2.13 80-6.22V660h119.3z" />
        </Box>
    );
}

// LinkedIn's "in" on its own, without the rounded square.
export function LinkedInGlyph() {
    return (
        <Box
            component="svg"
            viewBox="0.8 0.65 22.4 22.4"
            aria-hidden="true"
            sx={fillBadgeSx}
        >
            <path d="M18.5 18.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79z" />
            <path d="M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68z" />
            <path d="M8.27 18.5v-8.37H5.5v8.37h2.77z" />
        </Box>
    );
}
