import { useCallback, useEffect, useRef, useState } from "react";
import { Box, CircularProgress, IconButton, LinearProgress, Tooltip, Typography } from "@mui/material";
import { FullscreenRounded, PauseRounded, PlayArrowRounded, Replay10Rounded, SaveOutlined, SkipNextRounded, VolumeOffRounded, VolumeUpRounded } from "@mui/icons-material";
import { router } from "@inertiajs/react";
import StyledButton from "../utils/StyledButton";
import { readCookie } from "../../helpers/presence";

interface WebinarPlayerProps {
    videoId: string;
    // The video's length from the server (decides the %), and how far in they've already watched.
    duration: number;
    watched: number;
}

interface YTPlayer {
    playVideo(): void;
    pauseVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    getCurrentTime(): number;
    getPlayerState(): number;
    mute(): void;
    unMute(): void;
    isMuted(): boolean;
    destroy(): void;
}

declare global {
    interface Window {
        YT?: { Player: new (el: HTMLElement, options: object) => YTPlayer; PlayerState: Record<string, number> };
        onYouTubeIframeAPIReady?: () => void;
    }
}

const PLAYING = 1;
const PAUSED = 2;
const ENDED = 0;
const SAVE_EVERY_S = 30;
const PROGRESS_URL = "/welcome/nao/progress";

let apiReady: Promise<void> | null = null;
const loadYouTubeApi = () =>
    (apiReady ??= new Promise<void>((resolve) => {
        if (window.YT?.Player) return resolve();
        const previous = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            previous?.();
            resolve();
        };
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);
    }));

const clock = (s: number) => {
    const t = Math.max(0, Math.floor(s));
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const sec = String(t % 60).padStart(2, "0");
    return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

// The New Agents Webinar without YouTube's controls: it can't be skipped ahead (a jump past the furthest point watched is
// sent back), only rewound. How far they got is saved every 30 s while playing, on pause, with "Save progress", and once
// more as the page is left — so a refresh picks up at the same spot.
export default function WebinarPlayer({ videoId, duration, watched }: WebinarPlayerProps) {
    const frameRef = useRef<HTMLDivElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const player = useRef<YTPlayer | null>(null);
    const furthest = useRef(watched);
    const saved = useRef(watched);
    const sinceSave = useRef(0);
    const [ready, setReady] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(false);
    const [current, setCurrent] = useState(watched);
    const [reached, setReached] = useState(watched);
    const [savedAt, setSavedAt] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    const save = useCallback((force = false) => {
        const seconds = Math.floor(furthest.current);
        if (!force && seconds <= saved.current) return;
        setSaving(true);
        router.put(
            PROGRESS_URL,
            { seconds },
            {
                async: true,
                preserveState: true,
                preserveScroll: true,
                only: ["nao"],
                onSuccess: (page) => {
                    // What the server kept: a save it capped (too far since the last one) is sent again later.
                    saved.current = (page.props.nao as { seconds?: number } | undefined)?.seconds ?? seconds;
                    sinceSave.current = 0;
                    setSavedAt(Date.now());
                },
                onFinish: () => setSaving(false),
            },
        );
    }, []);

    // Leaving the page (refresh, tab closed, another page): a request that outlives it.
    const saveOnLeave = useCallback(() => {
        const seconds = Math.floor(furthest.current);
        if (seconds <= saved.current) return;
        saved.current = seconds;
        fetch(PROGRESS_URL, {
            method: "PUT",
            keepalive: true,
            credentials: "same-origin",
            headers: { "Content-Type": "application/json", Accept: "application/json", "X-Requested-With": "XMLHttpRequest", "X-XSRF-TOKEN": readCookie("XSRF-TOKEN") },
            body: JSON.stringify({ seconds }),
        }).catch(() => undefined);
    }, []);

    useEffect(() => {
        let cancelled = false;
        loadYouTubeApi().then(() => {
            if (cancelled || !frameRef.current || !window.YT) return;
            player.current = new window.YT.Player(frameRef.current, {
                videoId,
                width: "100%",
                height: "100%",
                playerVars: { controls: 0, disablekb: 1, modestbranding: 1, rel: 0, fs: 0, iv_load_policy: 3, playsinline: 1, enablejsapi: 1, start: Math.floor(watched), origin: window.location.origin },
                events: {
                    onReady: () => setReady(true),
                    onStateChange: (e: { data: number }) => {
                        setPlaying(e.data === PLAYING);
                        if (e.data === ENDED) {
                            furthest.current = duration;
                            setReached(duration);
                            save();
                        } else if (e.data === PAUSED) {
                            save();
                        }
                    },
                },
            });
        });
        return () => {
            cancelled = true;
            saveOnLeave();
            player.current?.destroy();
            player.current = null;
        };
        // Built once: later props (after a save) mustn't restart the video.
    }, []);

    // Once a second: follow the playhead, send it back if it jumped ahead, and save every 30 s (only when it moved on).
    useEffect(() => {
        const timer = setInterval(() => {
            const p = player.current;
            if (!p || !ready) return;
            const t = p.getCurrentTime();
            if (t > furthest.current + 2) {
                p.seekTo(furthest.current, true);
                return;
            }
            furthest.current = Math.max(furthest.current, t);
            setCurrent(t);
            setReached(furthest.current);
            if (++sinceSave.current >= SAVE_EVERY_S) save();
        }, 1000);
        return () => clearInterval(timer);
    }, [ready, save]);

    useEffect(() => {
        const onHide = () => document.visibilityState === "hidden" && saveOnLeave();
        document.addEventListener("visibilitychange", onHide);
        window.addEventListener("pagehide", saveOnLeave);
        return () => {
            document.removeEventListener("visibilitychange", onHide);
            window.removeEventListener("pagehide", saveOnLeave);
        };
    }, [saveOnLeave]);

    const percent = Math.min(100, Math.floor((reached * 100) / duration));

    const toggle = () => {
        const p = player.current;
        if (!p) return;
        if (playing) p.pauseVideo();
        else p.playVideo();
    };
    const seek = (to: number) => {
        player.current?.seekTo(Math.max(0, Math.min(to, furthest.current)), true);
        setCurrent(Math.max(0, Math.min(to, furthest.current)));
    };
    const toggleMute = () => {
        const p = player.current;
        if (!p) return;
        if (p.isMuted()) p.unMute();
        else p.mute();
        setMuted(!muted);
    };
    const fullscreen = () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else wrapRef.current?.requestFullscreen?.();
    };

    const iconSx = { color: "var(--lr-text-primary)" };

    return (
        <Box
            ref={wrapRef}
            sx={{
                borderRadius: 3,
                overflow: "hidden",
                border: "1px solid var(--lr-border)",
                backgroundColor: "var(--lr-surface)",
                "&:fullscreen": { display: "flex", flexDirection: "column", justifyContent: "center", backgroundColor: "var(--lr-video-bg)", borderRadius: 0 },
            }}
        >
            <Box sx={{ position: "relative", width: "100%", aspectRatio: "16 / 9", backgroundColor: "var(--lr-video-bg)", "& iframe": { position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 } }}>
                <div ref={frameRef} />
                {/* Clicks land here, not on YouTube's own links: a click plays / pauses. */}
                <Box onClick={toggle} sx={{ position: "absolute", inset: 0, cursor: ready ? "pointer" : "default" }} />
                {!ready && (
                    <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
                        <CircularProgress size={32} sx={{ color: "var(--lr-photo-ink)" }} />
                    </Box>
                )}
                {ready && !playing && (
                    <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
                        <Box sx={{ width: 72, height: 72, borderRadius: "50%", display: "grid", placeItems: "center", backgroundColor: "var(--lr-primary)", color: "var(--lr-on-primary)" }}>
                            <PlayArrowRounded sx={{ fontSize: 44 }} />
                        </Box>
                    </Box>
                )}
            </Box>

            <Box sx={{ px: { xs: 1, sm: 2 }, pt: 1.5, pb: 1, backgroundColor: "var(--lr-surface)" }}>
                <LinearProgress
                    variant="buffer"
                    value={(current * 100) / duration}
                    valueBuffer={(reached * 100) / duration}
                    aria-label="Webinar progress"
                    sx={{
                        height: 6,
                        borderRadius: 99,
                        backgroundColor: "var(--lr-surface-container)",
                        "& .MuiLinearProgress-bar1Buffer": { backgroundColor: "var(--lr-primary)" },
                        "& .MuiLinearProgress-bar2Buffer": { backgroundColor: "var(--lr-primary-soft-strong)" },
                        "& .MuiLinearProgress-dashed": { display: "none" },
                    }}
                />
                <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                    <Tooltip title={playing ? "Pause" : "Play"}>
                        <span>
                            <IconButton onClick={toggle} disabled={!ready} sx={iconSx}>
                                {playing ? <PauseRounded /> : <PlayArrowRounded />}
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="Back 10 seconds">
                        <span>
                            <IconButton onClick={() => seek(current - 10)} disabled={!ready} sx={iconSx}>
                                <Replay10Rounded />
                            </IconButton>
                        </span>
                    </Tooltip>
                    {reached - current > 10 && (
                        <Tooltip title="Back to where you left off">
                            <IconButton onClick={() => seek(reached)} sx={iconSx}>
                                <SkipNextRounded />
                            </IconButton>
                        </Tooltip>
                    )}
                    <Tooltip title={muted ? "Unmute" : "Mute"}>
                        <span>
                            <IconButton onClick={toggleMute} disabled={!ready} sx={iconSx}>
                                {muted ? <VolumeOffRounded /> : <VolumeUpRounded />}
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Typography variant="body2" sx={{ ml: 0.5, color: "var(--lr-text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                        {clock(current)} / {clock(duration)}
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--lr-primary)" }}>
                        {percent}% watched
                    </Typography>
                    <Tooltip title="Full screen">
                        <IconButton onClick={fullscreen} sx={iconSx}>
                            <FullscreenRounded />
                        </IconButton>
                    </Tooltip>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", px: 1, pb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)", flex: 1, minWidth: 180 }}>
                        {saving ? "Saving your progress…" : savedAt ? "Progress saved. Come back any time — it picks up where you left off." : "Your progress saves by itself every 30 seconds."}
                    </Typography>
                    <StyledButton size="small" startIcon={<SaveOutlined />} onClick={() => save(true)} disabled={!ready || saving} sx={{ color: "var(--lr-primary)" }}>
                        Save progress
                    </StyledButton>
                </Box>
            </Box>
        </Box>
    );
}
