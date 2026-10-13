import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
    Box,
    IconButton,
    Stack,
    SxProps,
    Tooltip,
    Typography,
} from "@mui/material";
import {
    ArrowForwardRounded,
    ChatBubbleOutlineRounded,
    ChevronRightRounded,
    DownloadRounded,
    ExpandLessRounded,
    ExpandMoreRounded,
    EmailRounded,
    Instagram,
    LanguageRounded,
    PhoneRounded,
    PlaceRounded,
    ShareRounded,
    WhatsApp,
    X,
} from "@mui/icons-material";
import { Head, Link } from "@inertiajs/react";
import PublicHeader from "../../components/layouts/PublicHeader";
import StyledButton from "../../components/utils/StyledButton";
import {
    FacebookGlyph,
    LinkedInGlyph,
} from "../../components/utils/BrandGlyphs";
import ShareCardDialog from "../../components/utils/ShareCardDialog";
import DotsQrCode from "../../components/utils/DotsQrCode";
import UserAvatar from "../../components/utils/user/UserAvatar";
import COVER_IMAGE from "../../../assets/business-profile-cover.jpg";
import QR_LOGO from "../../../assets/qr-logo.png";

interface BusinessProfile {
    name: string;
    title: string;
    avatar: string | null;
    mobile: string | null;
    email: string | null;
    address: string | null;
    about: string | null;
    area: string | null;
    province: string | null;
    joined_year: string | null;
    socials: {
        facebook: string | null;
        instagram: string | null;
        twitter: string | null;
        linkedin: string | null;
        whatsapp: string | null;
    };
    links: { label: string; url: string }[];
}

// The pin logo in the middle of every QR (160×251 px).
const QR_LOGO_RATIO = 160 / 251;
// Desktop: the About area never shrinks below this, even when the right column is short.
const ABOUT_MIN_HEIGHT = 150;

// A link as people read it: no scheme, no trailing slash.
const prettyUrl = (url: string) =>
    url.replace(/^https?:\/\//i, "").replace(/\/$/, "");

interface ShowProps {
    slug: string;
    agent: BusinessProfile;
}

// Each network's official round badge: white mark on its brand colour.
const SOCIALS: {
    key: keyof BusinessProfile["socials"];
    label: string;
    icon: ReactNode;
    background: string;
}[] = [
    {
        key: "facebook",
        label: "Facebook",
        icon: <FacebookGlyph />,
        background: "var(--lr-brand-facebook)",
    },
    {
        key: "instagram",
        label: "Instagram",
        icon: <Instagram sx={{ fontSize: "1.2em" }} />,
        background: "var(--lr-brand-instagram)",
    },
    {
        key: "linkedin",
        label: "LinkedIn",
        icon: <LinkedInGlyph />,
        background: "var(--lr-brand-linkedin)",
    },
    {
        key: "twitter",
        label: "X",
        icon: <X fontSize="inherit" />,
        background: "var(--lr-brand-x)",
    },
    {
        key: "whatsapp",
        label: "WhatsApp",
        icon: <WhatsApp fontSize="inherit" />,
        background: "var(--lr-brand-whatsapp)",
    },
];

const actionSx = {
    minHeight: 52,
    px: 2,
    fontSize: 16,
    fontWeight: 500,
    borderRadius: 2,
    gap: 0.5,
};

const primaryActionSx = {
    ...actionSx,
    backgroundColor: "var(--lr-primary)",
    color: "var(--lr-on-primary)",
    ":hover": { backgroundColor: "var(--lr-primary-hover)" },
};

const secondaryActionSx = {
    ...actionSx,
    backgroundColor: "var(--lr-surface)",
    color: "var(--lr-primary)",
    border: "1px solid var(--lr-primary)",
    ":hover": {
        backgroundColor: "var(--lr-primary-soft)",
        borderColor: "var(--lr-primary)",
    },
};

// A bold heading with the short red rule under it, as on the mock.
function SectionTitle({ children, sx }: { children: string; sx?: SxProps }) {
    return (
        // The underline follows the parent's alignment, so it sits centred under a centred title.
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "inherit",
                ...sx,
            }}
        >
            <Typography
                component="h2"
                sx={{
                    fontSize: { xs: 20, sm: 22 },
                    fontWeight: 700,
                    color: "var(--lr-text-primary)",
                }}
            >
                {children}
            </Typography>
            <Box
                sx={{
                    mt: 1,
                    width: 36,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: "var(--lr-primary)",
                }}
            />
        </Box>
    );
}

interface InfoRowProps {
    icon: ReactNode;
    label: string;
    value: string;
    href: string;
    external?: boolean;
    // "arrow": a filled primary circle with an arrow (My Links); default: a plain chevron (Contact Information).
    trailing?: "chevron" | "arrow";
}

// A tappable card: the whole row opens the dialer, mail app, the map or the agent's link.
function InfoRow({
    icon,
    label,
    value,
    href,
    external,
    trailing = "chevron",
}: InfoRowProps) {
    return (
        <Box
            component="a"
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.75,
                px: 1.5,
                py: 1.25,
                borderRadius: 3,
                border: "1px solid var(--lr-border)",
                backgroundColor: "var(--lr-surface)",
                color: "var(--lr-text-primary)",
                textDecoration: "none",
                // Left-aligned even inside the phone layout's centred column.
                textAlign: "left",
                transition: "background-color 0.15s, border-color 0.15s",
                ":hover": {
                    backgroundColor: "var(--lr-surface-dim)",
                    borderColor: "var(--lr-outline)",
                },
                // The link arrow tilts to point up-right while the row is hovered.
                ":hover .link-arrow": { transform: "rotate(-45deg)" },
            }}
        >
            <Box
                sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 99,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "var(--lr-primary-soft)",
                    color: "var(--lr-primary)",
                }}
            >
                {icon}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    sx={{ fontSize: 13, color: "var(--lr-text-secondary)" }}
                >
                    {label}
                </Typography>
                <Typography
                    sx={{
                        fontSize: 16,
                        fontWeight: 500,
                        color: "var(--lr-text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {value}
                </Typography>
            </Box>
            {trailing === "arrow" ? (
                <Box
                    sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 99,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "var(--lr-primary)",
                        color: "var(--lr-on-primary)",
                    }}
                >
                    <ArrowForwardRounded
                        className="link-arrow"
                        sx={{ fontSize: 20, transition: "transform 0.2s" }}
                    />
                </Box>
            ) : (
                <ChevronRightRounded
                    sx={{ color: "var(--lr-text-secondary)", flexShrink: 0 }}
                />
            )}
        </Box>
    );
}

export default function Show({ slug, agent }: ShowProps) {
    const socials = SOCIALS.filter((s) => agent.socials[s.key]);
    const profileUrl =
        typeof window === "undefined"
            ? `/business-profile/${slug}`
            : `${window.location.origin}/business-profile/${slug}`;

    const [sharing, setSharing] = useState(false);

    // Phones clamp About Me to ten lines; "Show more" appears only when text is actually cut.
    const aboutRef = useRef<HTMLElement>(null);
    const [aboutExpanded, setAboutExpanded] = useState(false);
    const [aboutClipped, setAboutClipped] = useState(false);
    useEffect(() => {
        const el = aboutRef.current;
        if (!el || aboutExpanded) return;
        const measure = () =>
            setAboutClipped(el.scrollHeight > el.clientHeight + 1);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, [aboutExpanded]);

    // Desktop: the About area is sized by hand so a short bio keeps the buttons close underneath while a
    // long one may only grow until the buttons sit level with the bottom of the right column; past that it
    // scrolls, and only then is the fade shown. My Links follow the buttons and may run on below the right column.
    const leftRef = useRef<HTMLDivElement>(null);
    const rightRef = useRef<HTMLDivElement>(null);
    const aboutBoxRef = useRef<HTMLDivElement>(null);
    const actionsRef = useRef<HTMLDivElement>(null);
    const [aboutHeight, setAboutHeight] = useState<number | null>(null);
    const [aboutScrolls, setAboutScrolls] = useState(false);
    useLayoutEffect(() => {
        const text = aboutRef.current;
        const left = leftRef.current;
        const right = rightRef.current;
        const box = aboutBoxRef.current;
        const actions = actionsRef.current;
        if (!text || !left || !right || !box || !actions) return;
        const measure = () => {
            const boxRect = box.getBoundingClientRect();
            const slack =
                right.getBoundingClientRect().bottom -
                actions.getBoundingClientRect().bottom;
            const limit = Math.max(ABOUT_MIN_HEIGHT, boxRect.height + slack);
            const natural = text.offsetHeight;
            const next = Math.round(Math.min(natural, limit));
            setAboutHeight(next);
            setAboutScrolls(natural > next + 1);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(text);
        observer.observe(left);
        observer.observe(right);
        observer.observe(actions);
        return () => observer.disconnect();
    }, []);

    const rows: InfoRowProps[] = [];
    if (agent.mobile)
        rows.push({
            icon: <PhoneRounded />,
            label: "Mobile",
            value: agent.mobile,
            href: `tel:${agent.mobile}`,
        });
    if (agent.email)
        rows.push({
            icon: <EmailRounded />,
            label: "Email",
            value: agent.email,
            href: `mailto:${agent.email}`,
        });
    if (agent.address) {
        rows.push({
            icon: <PlaceRounded />,
            label: "Address",
            value: agent.address,
            href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(agent.address)}`,
            external: true,
        });
    }

    return (
        <Box
            sx={{
                height: "100vh",
                "@supports (height: 100dvh)": { height: "100dvh" },
                // Self-scrolling: outside AppLayout, and html/body may be overflow-locked
                overflowY: "auto",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                backgroundColor: "var(--lr-surface-dim)",
            }}
        >
            <Head title={agent.name} />
            <PublicHeader />
            <ShareCardDialog
                open={sharing}
                onClose={() => setSharing(false)}
                url={profileUrl}
                name={agent.name}
            />

            <Box
                sx={{ flex: 1, px: { xs: 1.5, sm: 3 }, py: { xs: 1.5, sm: 3 } }}
            >
                <Box
                    component="article"
                    sx={{
                        maxWidth: 1280,
                        mx: "auto",
                        borderRadius: { xs: 4, sm: 6 },
                        overflow: "hidden",
                        border: "1px solid var(--lr-border)",
                        backgroundColor: "var(--lr-surface)",
                        boxShadow: "0 12px 40px rgba(60,64,67,.10)",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    {/* The whole banner, never cropped: it scales with the card width. */}
                    <Box
                        component="img"
                        src={COVER_IMAGE}
                        alt=""
                        sx={{ display: "block", width: "100%", height: "auto" }}
                    />

                    {/* Phones stack everything; from md the identity sits left and the QR / socials / contact details right. */}
                    <Box
                        sx={{
                            px: { xs: 2.5, sm: 4, md: 5 },
                            pb: { xs: 3, md: 4 },
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "minmax(0, 1fr)",
                                md: "minmax(0, 1fr) 380px",
                            },
                            columnGap: { md: 6, lg: 8 },
                            rowGap: 4,
                        }}
                    >
                        {/* Identity, about, actions, links */}
                        <Box
                            ref={leftRef}
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: { xs: "center", md: "stretch" },
                                textAlign: { xs: "center", md: "left" },
                            }}
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: { xs: "column", md: "row" },
                                    alignItems: {
                                        xs: "center",
                                        md: "flex-start",
                                    },
                                    gap: { xs: 1.5, md: 3 },
                                    width: "100%",
                                }}
                            >
                                <UserAvatar
                                    name={agent.name}
                                    src={agent.avatar}
                                    size={200}
                                    sx={{
                                        width: { xs: 140, sm: 200 },
                                        height: { xs: 140, sm: 200 },
                                        fontSize: { xs: 52, sm: 72 },
                                        mt: { xs: -8.75, sm: -12.5 },
                                        flexShrink: 0,
                                        border: "5px solid var(--lr-surface)",
                                        boxShadow:
                                            "0 0 0 3px var(--lr-primary), 0 6px 20px rgba(0,0,0,.16)",
                                    }}
                                />

                                <Box sx={{ minWidth: 0, pt: { md: 3 } }}>
                                    <Typography
                                        component="h1"
                                        sx={{
                                            fontSize: { xs: 28, sm: 38 },
                                            fontWeight: 700,
                                            lineHeight: 1.15,
                                            letterSpacing: "-0.01em",
                                            color: "var(--lr-text-primary)",
                                        }}
                                    >
                                        {agent.name}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            mt: 0.75,
                                            fontSize: { xs: 17, sm: 20 },
                                            color: "var(--lr-text-body)",
                                        }}
                                    >
                                        {agent.title}
                                    </Typography>
                                </Box>
                            </Box>

                            {/* From md the text fills whatever room the right column leaves and scrolls
                                past that, so the left column never grows taller than the right one. */}
                            <Box
                                sx={{
                                    mt: { xs: 3.5, md: 0 },
                                    width: "100%",
                                    // From md the heading and text area join the column directly, so any spare
                                    // height lands below the buttons rather than between the text and them.
                                    display: { xs: "flex", md: "contents" },
                                    flexDirection: "column",
                                    alignItems: {
                                        xs: "center",
                                        md: "flex-start",
                                    },
                                }}
                            >
                                <SectionTitle sx={{ mt: { md: 4 } }}>
                                    About Me
                                </SectionTitle>
                                <Box
                                    ref={aboutBoxRef}
                                    sx={{
                                        mt: 2.5,
                                        width: "100%",
                                        maxWidth: 760,
                                        mb: { md: 4.5 },
                                        position: "relative",
                                        flexShrink: 0,
                                        height: { md: aboutHeight ?? "auto" },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            position: { md: "absolute" },
                                            inset: { md: 0 },
                                            overflowY: { md: "auto" },
                                            pr: { md: 1 },
                                            scrollbarWidth: "thin",
                                            // Fade that sticks to the bottom edge only while there is more to scroll.
                                            "::after": {
                                                content: '""',
                                                display: {
                                                    xs: "none",
                                                    md: aboutScrolls
                                                        ? "block"
                                                        : "none",
                                                },
                                                position: "sticky",
                                                bottom: 0,
                                                height: 56,
                                                background:
                                                    "linear-gradient(to bottom, transparent, var(--lr-surface))",
                                                pointerEvents: "none",
                                            },
                                        }}
                                    >
                                        <Typography
                                            ref={aboutRef}
                                            sx={{
                                                fontSize: { xs: 16, sm: 18 },
                                                lineHeight: 1.7,
                                                color: "var(--lr-text-body)",
                                                whiteSpace: "pre-line",
                                                textAlign: "justify",
                                                display: {
                                                    xs: "-webkit-box",
                                                    md: "block",
                                                },
                                                WebkitBoxOrient: "vertical",
                                                WebkitLineClamp: {
                                                    xs: aboutExpanded
                                                        ? "unset"
                                                        : 10,
                                                    md: "unset",
                                                },
                                                overflow: {
                                                    xs: "hidden",
                                                    md: "visible",
                                                },
                                            }}
                                        >
                                            {agent.about ?? "No About me yet."}
                                        </Typography>
                                    </Box>
                                    {/* Phone-only fade over the clipped last lines */}
                                    <Box
                                        aria-hidden="true"
                                        sx={{
                                            position: "absolute",
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            height: 56,
                                            pointerEvents: "none",
                                            background:
                                                "linear-gradient(to bottom, transparent, var(--lr-surface))",
                                            display: {
                                                xs:
                                                    aboutClipped &&
                                                    !aboutExpanded
                                                        ? "block"
                                                        : "none",
                                                md: "none",
                                            },
                                        }}
                                    />
                                </Box>
                                <StyledButton
                                    variant="text"
                                    onClick={() => setAboutExpanded((v) => !v)}
                                    endIcon={
                                        aboutExpanded ? (
                                            <ExpandLessRounded />
                                        ) : (
                                            <ExpandMoreRounded />
                                        )
                                    }
                                    sx={{
                                        mt: 1,
                                        px: 1,
                                        fontSize: 15,
                                        fontWeight: 600,
                                        color: "var(--lr-primary)",
                                        display: {
                                            xs: aboutClipped
                                                ? "inline-flex"
                                                : "none",
                                            md: "none",
                                        },
                                    }}
                                >
                                    {aboutExpanded ? "Show less" : "Show more"}
                                </StyledButton>
                            </Box>

                            <Box
                                ref={actionsRef}
                                sx={{
                                    // The About area above carries the desktop gap, so a short bio keeps these close.
                                    mt: { xs: 3.5, md: 0 },
                                    width: "100%",
                                    maxWidth: 760,
                                    display: "grid",
                                    gap: { xs: 1.25, sm: 1.75 },
                                    gridTemplateColumns: {
                                        xs: "repeat(2, minmax(0, 1fr))",
                                        sm: "repeat(3, minmax(0, 1fr))",
                                    },
                                }}
                            >
                                <StyledButton
                                    component={Link}
                                    href={`/contact/${slug}`}
                                    variant="contained"
                                    startIcon={<ChatBubbleOutlineRounded />}
                                    sx={{
                                        ...primaryActionSx,
                                        gridColumn: {
                                            xs: "1 / -1",
                                            sm: "auto",
                                        },
                                    }}
                                >
                                    Contact me
                                </StyledButton>
                                <StyledButton
                                    component="a"
                                    href={`/contact/${slug}/vcard`}
                                    startIcon={<DownloadRounded />}
                                    sx={secondaryActionSx}
                                >
                                    Save card
                                </StyledButton>
                                <StyledButton
                                    onClick={() => setSharing(true)}
                                    startIcon={<ShareRounded />}
                                    sx={secondaryActionSx}
                                >
                                    Share
                                </StyledButton>
                            </Box>

                            {/* The agent's own links follow the buttons and may run on below the right column. */}
                            {agent.links.length > 0 && (
                                <Box
                                    component="section"
                                    sx={{
                                        mt: 4,
                                        width: "100%",
                                        maxWidth: 760,
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: {
                                            xs: "center",
                                            md: "flex-start",
                                        },
                                    }}
                                >
                                    <SectionTitle>My Links</SectionTitle>
                                    <Box
                                        sx={{
                                            mt: 2.5,
                                            width: "100%",
                                            display: "grid",
                                            gap: 1.25,
                                            // Two columns from md so a long list stays short beside the right column.
                                            gridTemplateColumns: {
                                                xs: "minmax(0, 1fr)",
                                                md: "repeat(2, minmax(0, 1fr))",
                                            },
                                        }}
                                    >
                                        {agent.links.map((link, index) => (
                                            <InfoRow
                                                key={index}
                                                icon={<LanguageRounded />}
                                                label={link.label}
                                                value={prettyUrl(link.url)}
                                                href={link.url}
                                                external
                                                trailing="arrow"
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </Box>

                        {/* QR + socials panel (overlaps the cover on desktop), then the contact rows */}
                        <Stack
                            ref={rightRef}
                            gap={3.5}
                            sx={{
                                mt: { md: -2 },
                                position: "relative",
                                alignSelf: { md: "start" },
                            }}
                        >
                            <Box
                                component="section"
                                sx={{
                                    p: { xs: 2.5, sm: 3 },
                                    borderRadius: 4,
                                    backgroundColor: "var(--lr-surface-dim)",
                                    border: "1px solid var(--lr-border)",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    textAlign: "center",
                                }}
                            >
                                {/* Tapping the QR opens the same share dialog as the Share button. */}
                                <Box
                                    component="button"
                                    type="button"
                                    onClick={() => setSharing(true)}
                                    aria-label="Share this card"
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 4,
                                        lineHeight: 0,
                                        border: 0,
                                        cursor: "pointer",
                                        // Always white so phone cameras read it in dark mode too.
                                        backgroundColor: "var(--lr-logo-tile)",
                                        boxShadow: "0 4px 16px rgba(0,0,0,.08)",
                                        transition:
                                            "transform 0.15s, box-shadow 0.15s",
                                        ":hover": {
                                            transform: "translateY(-2px)",
                                            boxShadow:
                                                "0 8px 20px rgba(0,0,0,.14)",
                                        },
                                        ":focus-visible": {
                                            outline:
                                                "3px solid var(--lr-primary)",
                                            outlineOffset: 2,
                                        },
                                    }}
                                >
                                    <DotsQrCode
                                        value={profileUrl}
                                        size={150}
                                        label="QR code for this profile"
                                        logo={QR_LOGO}
                                        logoRatio={QR_LOGO_RATIO}
                                    />
                                </Box>
                                <Typography
                                    component="h2"
                                    sx={{
                                        mt: 2.5,
                                        fontSize: 20,
                                        fontWeight: 700,
                                        color: "var(--lr-text-primary)",
                                    }}
                                >
                                    Connect with me
                                </Typography>
                                {socials.length > 0 ? (
                                    <Stack
                                        direction="row"
                                        flexWrap="wrap"
                                        justifyContent="center"
                                        gap={1.5}
                                        sx={{ mt: 2 }}
                                    >
                                        {socials.map((s) => (
                                            <Tooltip
                                                key={s.key}
                                                title={s.label}
                                            >
                                                <IconButton
                                                    component="a"
                                                    href={
                                                        agent.socials[s.key] ??
                                                        undefined
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    aria-label={s.label}
                                                    sx={{
                                                        width: 50,
                                                        height: 50,
                                                        fontSize: 26,
                                                        position: "relative",
                                                        overflow: "hidden",
                                                        background:
                                                            s.background,
                                                        color: "var(--lr-brand-ink)",
                                                        transition:
                                                            "transform 0.15s, box-shadow 0.15s",
                                                        ":hover": {
                                                            background:
                                                                s.background,
                                                            transform:
                                                                "translateY(-2px)",
                                                            boxShadow:
                                                                "0 6px 16px rgba(0,0,0,.18)",
                                                        },
                                                    }}
                                                >
                                                    {s.icon}
                                                </IconButton>
                                            </Tooltip>
                                        ))}
                                    </Stack>
                                ) : (
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            mt: 1.5,
                                            color: "var(--lr-text-secondary)",
                                        }}
                                    >
                                        No social links yet.
                                    </Typography>
                                )}
                            </Box>

                            <Box component="section">
                                <SectionTitle>Contact Information</SectionTitle>
                                <Stack gap={1.25} sx={{ mt: 2.5 }}>
                                    {rows.map((row) => (
                                        <InfoRow key={row.label} {...row} />
                                    ))}
                                </Stack>
                            </Box>
                        </Stack>
                    </Box>

                    <Box
                        component="footer"
                        sx={{
                            position: "relative",
                            overflow: "hidden",
                            py: 2.5,
                            pl: 2,
                            // Keep the text clear of the corner shapes on narrow screens.
                            pr: { xs: 15, sm: 2 },
                            borderTop: "1px solid var(--lr-border)",
                            backgroundColor: "var(--lr-surface-dim)",
                            textAlign: { xs: "left", sm: "center" },
                            // The two-tone red corner of the mock: a bright slanted stripe in front of a darker block.
                            "::before, ::after": {
                                content: '""',
                                position: "absolute",
                                top: 0,
                                right: 0,
                                bottom: 0,
                                clipPath:
                                    "polygon(40% 0, 100% 0, 100% 100%, 0 100%)",
                            },
                            "::before": {
                                width: { xs: 104, sm: 280 },
                                backgroundColor: "var(--lr-primary)",
                            },
                            "::after": {
                                width: { xs: 72, sm: 200 },
                                backgroundColor: "var(--lr-primary-hover)",
                            },
                        }}
                    >
                        <Typography
                            sx={{
                                position: "relative",
                                color: "var(--lr-text-secondary)",
                                fontSize: { xs: 12, sm: 14 },
                                lineHeight: 1.5,
                            }}
                        >
                            © Leuterio Realty | {new Date().getFullYear()} All
                            Rights Reserved
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
