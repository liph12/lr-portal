import { ReactNode, useState } from "react";
import { Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import {
    ChatBubbleOutlineRounded,
    ChevronRightRounded,
    DownloadRounded,
    EmailRounded,
    Facebook,
    Instagram,
    LinkedIn,
    PhoneRounded,
    PlaceRounded,
    ShareRounded,
    WhatsApp,
    X,
} from "@mui/icons-material";
import { Head, Link } from "@inertiajs/react";
import PublicHeader from "../../components/layouts/PublicHeader";
import StyledButton from "../../components/utils/StyledButton";
import ShareCardDialog from "../../components/utils/ShareCardDialog";
import DotsQrCode from "../../components/utils/DotsQrCode";
import UserAvatar from "../../components/utils/user/UserAvatar";
import COVER_IMAGE from "../../../assets/business-profile-cover.jpg";

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
}

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
        icon: <Facebook fontSize="inherit" />,
        background: "var(--lr-brand-facebook)",
    },
    {
        key: "instagram",
        label: "Instagram",
        icon: <Instagram fontSize="inherit" />,
        background: "var(--lr-brand-instagram)",
    },
    {
        key: "linkedin",
        label: "LinkedIn",
        icon: <LinkedIn fontSize="inherit" />,
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
function SectionTitle({ children }: { children: string }) {
    return (
        <Box>
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
}

// A tappable card: the whole row opens the dialer, mail app, WhatsApp or the map.
function InfoRow({ icon, label, value, href, external }: InfoRowProps) {
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
                transition: "background-color 0.15s, border-color 0.15s",
                ":hover": {
                    backgroundColor: "var(--lr-surface-dim)",
                    borderColor: "var(--lr-outline)",
                },
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
            <ChevronRightRounded
                sx={{ color: "var(--lr-text-secondary)", flexShrink: 0 }}
            />
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
    if (agent.socials.whatsapp)
        rows.push({
            icon: <WhatsApp />,
            label: "WhatsApp",
            value: "Message on WhatsApp",
            href: agent.socials.whatsapp,
            external: true,
        });
    if (agent.address) {
        rows.push({
            icon: <PlaceRounded />,
            label: "Office",
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
                        {/* Identity, about, actions */}
                        <Box
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

                            <Box
                                sx={{
                                    mt: { xs: 3.5, md: 4 },
                                    width: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: {
                                        xs: "center",
                                        md: "flex-start",
                                    },
                                }}
                            >
                                <SectionTitle>About Me</SectionTitle>
                                <Typography
                                    sx={{
                                        mt: 2.5,
                                        fontSize: { xs: 16, sm: 18 },
                                        lineHeight: 1.7,
                                        color: "var(--lr-text-body)",
                                        whiteSpace: "pre-line",
                                        textAlign: "justify",
                                        maxWidth: 760,
                                    }}
                                >
                                    {agent.about ?? "No About me yet."}
                                </Typography>
                            </Box>

                            <Box
                                sx={{
                                    mt: { xs: 3.5, md: 4.5 },
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
                        </Box>

                        {/* QR + socials panel (overlaps the cover on desktop), then the contact rows */}
                        <Stack
                            gap={3.5}
                            sx={{ mt: { md: -2 }, position: "relative" }}
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
                                <Box
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 4,
                                        lineHeight: 0,
                                        // Always white so phone cameras read it in dark mode too.
                                        backgroundColor: "var(--lr-logo-tile)",
                                        boxShadow: "0 4px 16px rgba(0,0,0,.08)",
                                    }}
                                >
                                    <DotsQrCode
                                        value={profileUrl}
                                        size={150}
                                        label="QR code for this profile"
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
                            px: 2,
                            borderTop: "1px solid var(--lr-border)",
                            backgroundColor: "var(--lr-surface-dim)",
                            textAlign: "center",
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
                                width: { xs: 130, sm: 280 },
                                backgroundColor: "var(--lr-primary)",
                            },
                            "::after": {
                                width: { xs: 90, sm: 200 },
                                backgroundColor: "var(--lr-primary-hover)",
                            },
                        }}
                    >
                        <Typography
                            sx={{
                                color: "var(--lr-text-secondary)",
                                fontSize: { xs: 12, sm: 14 },
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
