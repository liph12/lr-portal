import { ReactNode } from "react";
import { Box } from "@mui/material";

// The cards' illustrated icons (Management, Reports, NATCON): simple flat drawings in the portal's own colours — dark blue
// (--lr-primary) for the shapes, the brand red (--lr-accent) for one detail, a pale blue for secondary fills — so they follow
// light and dark mode like everything else.
export type SpotName =
    | "id-card"
    | "team"
    | "sub-team"
    | "transfer"
    | "inbox"
    | "key"
    | "graduation"
    | "chart-up"
    | "trophy"
    | "medal"
    | "star-badge"
    | "crown-team"
    | "map-pin"
    | "buildings"
    | "map"
    | "for-sale"
    | "house-key"
    | "star-trophy"
    | "coins";

// The colours every drawing uses, by role — read from the tile, so a tone (below) can swap them all.
const TONE: Record<string, string> = {
    main: "var(--spot-main)",
    accent: "var(--spot-accent)",
    soft: "var(--spot-soft)",
};
const CUT = "var(--spot-cut)";

// brand: the portal's blue with a red detail on a pale tile (follows light / dark); gold: NATCON's gold on near-black.
const TONES = {
    brand: { "--spot-tile": "var(--lr-primary-soft)", "--spot-main": "var(--lr-primary)", "--spot-accent": "var(--lr-accent)", "--spot-soft": "var(--lr-primary-soft-strong)", "--spot-cut": "var(--lr-surface)" },
    gold: { "--spot-tile": "var(--lr-natcon-tile)", "--spot-main": "var(--lr-natcon-gold)", "--spot-accent": "var(--lr-natcon-gold-bright)", "--spot-soft": "var(--lr-natcon-gold-soft)", "--spot-cut": "var(--lr-natcon-tile)" },
};

// A head and shoulders, centred on x; the size scales it.
// An outline in the tile's colour separates overlapping figures, as flat icon sets do.
function Person({ x, y, s = 1, fill }: { x: number; y: number; s?: number; fill: string }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`} stroke="var(--spot-tile)" strokeWidth={2.2 / s} paintOrder="stroke">
            <path d="M-8 12 C-8 5 -4.5 2 0 2 C4.5 2 8 5 8 12 Z" fill={fill} />
            <circle cx="0" cy="-4" r="5" fill={fill} />
        </g>
    );
}

function drawing(name: SpotName, g: (c: string) => string): ReactNode {
    switch (name) {
        case "id-card":
            return (
                <>
                    <rect x="6" y="11" width="36" height="27" rx="4" fill={g("main")} />
                    <rect x="6" y="11" width="36" height="7" rx="4" fill={g("main")} />
                    <rect x="20" y="8" width="8" height="6" rx="1.5" fill={g("soft")} />
                    <rect x="10" y="21" width="12" height="13" rx="2" fill={g("soft")} />
                    <circle cx="16" cy="25.5" r="2.6" fill={g("accent")} />
                    <path d="M11.5 33 C11.5 29.5 13.5 28.6 16 28.6 C18.5 28.6 20.5 29.5 20.5 33 Z" fill={g("accent")} />
                    <rect x="25" y="22" width="13" height="2.4" rx="1.2" fill={CUT} />
                    <rect x="25" y="27" width="10" height="2.4" rx="1.2" fill={CUT} />
                    <rect x="25" y="32" width="8" height="2.4" rx="1.2" fill={g("accent")} />
                </>
            );
        case "team":
            return (
                <>
                    <Person x={12} y={24} s={0.85} fill={g("main")} />
                    <Person x={36} y={24} s={0.85} fill={g("main")} />
                    <Person x={24} y={27} s={1.1} fill={g("main")} />
                </>
            );
        case "sub-team":
            return (
                <>
                    <circle cx="24" cy="24" r="19" fill="none" stroke={g("main")} strokeWidth="2.4" strokeDasharray="5 3.5" strokeLinecap="round" />
                    <Person x={16} y={24} s={0.6} fill={g("main")} />
                    <Person x={32} y={24} s={0.6} fill={g("main")} />
                    <Person x={24} y={27} s={0.78} fill={g("accent")} />
                </>
            );
        case "transfer":
            return (
                <>
                    <path d="M8 18 H30 V12 L41 21 L30 30 V24 H8 Z" fill={g("main")} />
                    <path d="M40 30 H18 V24 L7 33 L18 42 V36 H40 Z" fill={g("accent")} />
                </>
            );
        case "inbox":
            return (
                <>
                    <rect x="15" y="5" width="18" height="22" rx="2" fill={g("soft")} stroke={TONE.main} strokeWidth="0.8" />
                    <rect x="18.5" y="10" width="11" height="2" rx="1" fill={TONE.main} />
                    <rect x="18.5" y="14.5" width="8" height="2" rx="1" fill={TONE.main} />
                    <path d="M5 26 L11 18 H37 L43 26 V38 a4 4 0 0 1 -4 4 H9 a4 4 0 0 1 -4 -4 Z" fill={g("main")} />
                    <path d="M5 26 H16 L18.5 30 H29.5 L32 26 H43 V38 a4 4 0 0 1 -4 4 H9 a4 4 0 0 1 -4 -4 Z" fill={g("main")} />
                    <circle cx="36" cy="12" r="6.5" fill={g("accent")} />
                    <path d="M33 12 L35.2 14.2 L39.2 10" fill="none" stroke={CUT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </>
            );
        case "key":
            return (
                <>
                    <circle cx="15" cy="19" r="10" fill={g("accent")} />
                    <circle cx="15" cy="19" r="4" fill={CUT} />
                    <path d="M22 24 L38 40 L34.5 43.5 L32 41 L29.5 43.5 L27 41 L29.5 38.5 L18.5 27.5 Z" fill={g("accent")} />
                    <path d="M9 13 a9 9 0 0 1 9 -3" fill="none" stroke={CUT} strokeWidth="1.6" strokeLinecap="round" />
                    <rect x="30" y="6" width="12" height="9" rx="2" transform="rotate(20 36 10.5)" fill={g("accent")} />
                    <circle cx="32.5" cy="9" r="1.2" fill={CUT} />
                </>
            );
        case "graduation":
            return (
                <>
                    <path d="M8 33 h32 v6 a2 2 0 0 1 -2 2 h-28 a2 2 0 0 1 -2 -2 Z" fill={g("accent")} />
                    <rect x="9" y="34.5" width="30" height="2" fill={CUT} />
                    <path d="M14 22 v7 c0 3 4.5 5 10 5 s10 -2 10 -5 v-7 Z" fill={g("main")} />
                    <path d="M24 9 L44 18 L24 27 L4 18 Z" fill={g("main")} />
                    <path d="M24 9 L44 18 L39 20.3 L24 13.5 L9 20.3 L4 18 Z" fill={CUT} />
                    <path d="M38 20 V31" stroke={g("accent")} strokeWidth="1.8" />
                    <circle cx="38" cy="32.5" r="2.4" fill={g("accent")} />
                </>
            );
        case "chart-up":
            return (
                <>
                    <rect x="7" y="30" width="7" height="11" rx="1.5" fill={g("soft")} />
                    <rect x="17" y="24" width="7" height="17" rx="1.5" fill={g("main")} />
                    <rect x="27" y="18" width="7" height="23" rx="1.5" fill={g("soft")} />
                    <rect x="37" y="11" width="5" height="30" rx="1.5" fill={g("accent")} />
                    <path d="M6 24 L17 15 L25 19 L38 6" fill="none" stroke={g("accent")} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M31.5 5.5 H39 V13" fill="none" stroke={g("accent")} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </>
            );
        case "trophy":
            return (
                <>
                    <rect x="14" y="38" width="20" height="5" rx="1.5" fill={g("main")} />
                    <rect x="20" y="30" width="8" height="9" fill={g("accent")} />
                    <path d="M12 9 a5 5 0 0 0 0 10 h2" fill="none" stroke={g("accent")} strokeWidth="3" />
                    <path d="M36 9 a5 5 0 0 1 0 10 h-2" fill="none" stroke={g("accent")} strokeWidth="3" />
                    <path d="M12 6 H36 V15 C36 24 30.5 31 24 31 C17.5 31 12 24 12 15 Z" fill={g("accent")} />
                    <path d="M15 8 H20 V16 C20 21 21.5 25 23 27 C17.5 25.5 15 21 15 15 Z" fill={CUT} />
                    <path d="M24 11 L25.6 15 L29.8 15.2 L26.5 17.8 L27.7 21.9 L24 19.5 L20.3 21.9 L21.5 17.8 L18.2 15.2 L22.4 15 Z" fill={CUT} />
                </>
            );
        case "medal":
            return (
                <>
                    <path d="M13 3 H22 L28 19 L21 21 Z" fill={g("main")} />
                    <path d="M35 3 H26 L20 19 L27 21 Z" fill={g("accent")} />
                    <circle cx="24" cy="30" r="12" fill={g("accent")} />
                    <circle cx="24" cy="30" r="8.5" fill="none" stroke={CUT} strokeWidth="1.4" />
                    <path d="M24 24 L25.8 28 L30 28.3 L26.8 31 L27.8 35.2 L24 32.9 L20.2 35.2 L21.2 31 L18 28.3 L22.2 28 Z" fill={CUT} />
                </>
            );
        case "star-badge":
            return (
                <>
                    <path d="M16 30 L12 44 L18 41 L21 46 L24 33 Z" fill={g("accent")} />
                    <path d="M32 30 L36 44 L30 41 L27 46 L24 33 Z" fill={g("accent")} />
                    <path d="M24 3 L28.5 7 L34.5 6.5 L35.5 12.5 L40.5 16 L37.5 21.5 L39.5 27 L34 29.5 L32 35 L26 34 L24 35.5 L22 34 L16 35 L14 29.5 L8.5 27 L10.5 21.5 L7.5 16 L12.5 12.5 L13.5 6.5 L19.5 7 Z" fill={g("accent")} />
                    <circle cx="24" cy="20" r="9.5" fill={g("main")} />
                    <path d="M24 13.5 L25.8 17.6 L30.2 18 L26.9 20.9 L27.9 25.2 L24 22.9 L20.1 25.2 L21.1 20.9 L17.8 18 L22.2 17.6 Z" fill={g("accent")} />
                </>
            );
        case "crown-team":
            return (
                <>
                    <Person x={12} y={29} s={0.8} fill={g("main")} />
                    <Person x={36} y={29} s={0.8} fill={g("main")} />
                    <Person x={24} y={31} s={1} fill={g("main")} />
                    <path d="M15 14 L18 5 L24 11 L30 5 L33 14 Z" fill={g("accent")} />
                    <rect x="15" y="13" width="18" height="4" rx="1" fill={g("accent")} />
                    <circle cx="24" cy="15" r="1.4" fill={g("accent")} />
                </>
            );
        case "map-pin":
            return (
                <>
                    <ellipse cx="24" cy="41" rx="12" ry="3.5" fill={g("soft")} />
                    <path d="M24 41 C16 31 11 25 11 18 A13 13 0 0 1 37 18 C37 25 32 31 24 41 Z" fill={g("accent")} />
                    <circle cx="24" cy="18" r="5.5" fill={CUT} />
                    <path d="M15.5 12 A10 10 0 0 1 22 7.5" fill="none" stroke={CUT} strokeWidth="2" strokeLinecap="round" />
                </>
            );
        case "buildings":
            return (
                <>
                    <rect x="7" y="20" width="14" height="23" rx="1.5" fill={g("soft")} />
                    <rect x="19" y="6" width="17" height="37" rx="1.5" fill={g("main")} />
                    <rect x="33" y="16" width="9" height="27" rx="1.5" fill={g("main")} />
                    {[0, 1, 2, 3, 4].map((r) => [0, 1].map((c) => <rect key={`${r}${c}`} x={22.5 + c * 6} y={10 + r * 6} width="3.6" height="3.6" rx="0.6" fill={CUT} />))}
                    {[0, 1, 2].map((r) => <rect key={r} x={10} y={24 + r * 6} width="8" height="3" rx="0.6" fill={TONE.main} />)}
                    <rect x="25" y="36" width="6" height="7" rx="1" fill={g("accent")} />
                </>
            );
        case "map":
            return (
                <>
                    <path d="M5 12 L17 8 L31 12 L43 8 V38 L31 42 L17 38 L5 42 Z" fill={g("soft")} stroke={TONE.main} strokeWidth="0.8" />
                    <path d="M17 8 V38 L31 42 V12 Z" fill={g("soft")} />
                    <path d="M8 30 C14 26 18 33 24 28 S36 24 40 20" fill="none" stroke={g("main")} strokeWidth="2.2" strokeDasharray="3 2.5" strokeLinecap="round" />
                    <path d="M31 27 C27 22 25 19 25 15.5 A6 6 0 0 1 37 15.5 C37 19 35 22 31 27 Z" fill={g("accent")} />
                    <circle cx="31" cy="15.5" r="2.3" fill={CUT} />
                </>
            );
        case "for-sale":
            return (
                <>
                    <path d="M4 22 L20 9 L36 22 V42 H4 Z" fill={g("soft")} />
                    <path d="M1.5 23.5 L20 8 L38.5 23.5" fill="none" stroke={g("main")} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="15" y="30" width="10" height="12" rx="1.2" fill={g("main")} />
                    <rect x="8" y="25" width="6" height="5.5" rx="0.8" fill={CUT} />
                    <path d="M40 22 V44" stroke={TONE.main} strokeWidth="2.2" />
                    <rect x="31" y="24" width="15" height="10" rx="1.5" fill={g("accent")} />
                    <rect x="33.5" y="27.5" width="10" height="1.6" rx="0.8" fill={CUT} />
                    <rect x="33.5" y="30.5" width="6.5" height="1.6" rx="0.8" fill={CUT} />
                </>
            );
        case "house-key":
            return (
                <>
                    <path d="M6 23 L22 10 L38 23 V42 H6 Z" fill={g("soft")} stroke={TONE.main} strokeWidth="0.8" />
                    <path d="M3 24.5 L22 9 L41 24.5 L38 27 L22 14 L6 27 Z" fill={g("accent")} />
                    <rect x="17" y="30" width="10" height="12" rx="1.2" fill={g("main")} />
                    <rect x="9.5" y="27" width="6" height="5.5" rx="0.8" fill={CUT} />
                    <circle cx="36" cy="33" r="5.5" fill={g("accent")} />
                    <circle cx="36" cy="33" r="2" fill={CUT} />
                    <path d="M39.5 37 L45 42.5 L43 44.5 L41.5 43 L40 44.5 L38.5 43 L40 41.5 L37.5 39 Z" fill={g("accent")} />
                </>
            );
        case "star-trophy":
            return (
                <>
                    <rect x="11" y="37" width="22" height="6" rx="1.5" fill={TONE.main} />
                    <rect x="15" y="38.8" width="14" height="2.4" rx="0.6" fill={g("accent")} />
                    <rect x="12.5" y="35" width="19" height="2.5" rx="0.8" fill={g("accent")} />
                    <path d="M16 35.5 C9 27 12.5 16 26 14.5 C19 18.5 17 26 21.5 35.5 Z" fill={g("accent")} />
                    <path d="M32 2.5 L34.6 8.6 L41.2 9.2 L36.2 13.6 L37.7 20 L32 16.6 L26.3 20 L27.8 13.6 L22.8 9.2 L29.4 8.6 Z" fill={g("accent")} />
                    <path d="M32 6 L33.5 9.8 L37 10.2" fill="none" stroke={CUT} strokeWidth="1.2" strokeLinecap="round" />
                </>
            );
        case "coins":
            return (
                <>
                    {[0, 1, 2, 3].map((i) => (
                        <g key={i}>
                            <ellipse cx="17" cy={40 - i * 5} rx="11" ry="3.6" fill={g("accent")} />
                            <ellipse cx="17" cy={38.6 - i * 5} rx="11" ry="3.6" fill={TONE.soft} />
                        </g>
                    ))}
                    <circle cx="32" cy="22" r="11" fill={g("accent")} />
                    <circle cx="32" cy="22" r="8" fill="none" stroke={CUT} strokeWidth="1.3" />
                    <text x="32" y="26.6" textAnchor="middle" fontSize="13" fontWeight="700" fill={CUT} fontFamily="Inter, Arial, sans-serif">
                        ₱
                    </text>
                </>
            );
    }
}

// Drawn at 70% inside a soft rounded tile: the modern, quiet way cards carry an icon.
export default function SpotIcon({ name, size = 48, tone = "brand" }: { name: SpotName; size?: number; tone?: keyof typeof TONES }) {
    const g = (role: string) => TONE[role] ?? TONE.main;

    return (
        <Box
            aria-hidden
            sx={{
                ...TONES[tone],
                // The gold plate keeps its edge on dark cards too.
                ...(tone === "gold" ? { border: "1px solid var(--lr-natcon-gold-soft)", boxSizing: "border-box" } : {}),
                width: size,
                height: size, flexShrink: 0, borderRadius: "28%", display: "grid", placeItems: "center", backgroundColor: "var(--spot-tile)" }}
        >
            <Box component="svg" viewBox="0 0 48 48" sx={{ width: "70%", height: "70%", display: "block", overflow: "visible" }}>
                {drawing(name, g)}
            </Box>
        </Box>
    );
}
