import { useEffect, useRef, useState } from "react";
import { Alert, Box, CircularProgress, Dialog, LinearProgress, Snackbar, Typography } from "@mui/material";
import { router } from "@inertiajs/react";
import { TOAST_EVENT, ToastMessage, ToastSeverity } from "../../../helpers/toast";

interface Toast extends ToastMessage {
    key: number;
}

// Quick saves finish before this, so they never flash a modal.
const SHOW_AFTER_MS = 350;
const DURATION: Record<ToastSeverity, number> = { success: 4000, info: 4000, warning: 6000, error: 7000 };

const firstError = (errors: Record<string, string | string[]>) => {
    const value = Object.values(errors)[0];
    return Array.isArray(value) ? value[0] : value;
};

// The app's feedback for every write, mounted once at the root: a small progress modal while a submit / save / delete is
// on its way (with the upload's progress), and toasts for how it went — the server's flash messages, validation
// errors, failures — plus any helpers/toast.ts call. Background writes that only refresh a prop (`only: [...]`, e.g. the
// theme switch) and GET visits don't get the modal.
export default function AppFeedback() {
    const [saving, setSaving] = useState(false);
    const [percent, setPercent] = useState<number | null>(null);
    const [queue, setQueue] = useState<Toast[]>([]);
    const [current, setCurrent] = useState<Toast | null>(null);
    const timer = useRef<number | null>(null);
    const writing = useRef(false);
    const seq = useRef(0);

    const push = (severity: ToastSeverity, message: string | null | undefined) => {
        if (message) setQueue((q) => [...q, { severity, message, key: ++seq.current }]);
    };

    // One toast at a time: the next one shows when the current one closes.
    useEffect(() => {
        if (!current && queue.length) {
            setCurrent(queue[0]);
            setQueue((q) => q.slice(1));
        }
    }, [current, queue]);

    useEffect(() => {
        const stopModal = () => {
            if (timer.current) window.clearTimeout(timer.current);
            timer.current = null;
            setSaving(false);
            setPercent(null);
        };

        const offs = [
            router.on("start", (event) => {
                const visit = event.detail.visit;
                writing.current = visit.method !== "get";
                if (!writing.current || visit.only.length || visit.async) return;
                timer.current = window.setTimeout(() => setSaving(true), SHOW_AFTER_MS);
            }),
            router.on("progress", (event) => {
                const p = event.detail.progress?.percentage;
                if (writing.current && typeof p === "number") setPercent(Math.round(p));
            }),
            router.on("finish", stopModal),
            router.on("success", (event) => {
                // Pages prefetched before this write show old data: drop them (the server's cache moves on by itself).
                if (writing.current) router.flushAll();
                const { flash, status } = event.detail.page.props as { flash?: Record<string, string | null>; status?: number };
                if (flash) {
                    push("success", flash.success);
                    push("warning", flash.warning);
                    push("error", flash.error);
                }
                // A write that landed on the error page (403 / 404 / 500…).
                if (writing.current && event.detail.page.component === "Error") push("error", status === 403 ? "You're not allowed to do that." : "That didn't go through. Try again.");
            }),
            router.on("error", (event) => {
                const message = firstError(event.detail.errors as Record<string, string | string[]>);
                push("error", message ? `Please check the form: ${message}` : "Please check the highlighted fields.");
            }),
            router.on("exception", () => push("error", "Couldn't reach the server. Check your connection and try again.")),
            router.on("invalid", (event) => {
                // Locally, keep Inertia's modal with the real error page for debugging.
                if (import.meta.env.PROD) event.preventDefault();
                push("error", "Something went wrong on the server. Try again, or ask an admin if it keeps happening.");
            }),
        ];
        const onToast = (event: Event) => {
            const { severity, message } = (event as CustomEvent<ToastMessage>).detail;
            push(severity, message);
        };
        window.addEventListener(TOAST_EVENT, onToast);

        return () => {
            offs.forEach((off) => off());
            window.removeEventListener(TOAST_EVENT, onToast);
            stopModal();
        };
    }, []);

    return (
        <>
            <Dialog
                open={saving}
                disableEscapeKeyDown
                aria-labelledby="app-saving-title"
                slotProps={{ paper: { sx: { borderRadius: 4, px: 4, py: 3, minWidth: 260, backgroundColor: "var(--lr-surface)", textAlign: "center" } } }}
            >
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
                    <CircularProgress size={36} sx={{ color: "var(--lr-primary)" }} />
                    <Typography id="app-saving-title" sx={{ fontWeight: 500, color: "var(--lr-text-primary)" }}>
                        {percent !== null && percent < 100 ? "Uploading…" : "Saving…"}
                    </Typography>
                    {percent !== null && percent < 100 && (
                        <Box sx={{ width: "100%" }}>
                            <LinearProgress variant="determinate" value={percent} sx={{ height: 6, borderRadius: 99 }} />
                            <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                                {percent}%
                            </Typography>
                        </Box>
                    )}
                    <Typography variant="caption" sx={{ color: "var(--lr-text-secondary)" }}>
                        Please keep this page open.
                    </Typography>
                </Box>
            </Dialog>

            <Snackbar
                key={current?.key}
                open={!!current}
                autoHideDuration={current ? DURATION[current.severity] : null}
                onClose={(_, reason) => reason !== "clickaway" && setCurrent(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                sx={{ maxWidth: { sm: 440 } }}
            >
                {current ? (
                    <Alert severity={current.severity} variant="filled" onClose={() => setCurrent(null)} sx={{ width: "100%", borderRadius: 3, alignItems: "center", boxShadow: "0 4px 14px rgba(0,0,0,.18)" }}>
                        {current.message}
                    </Alert>
                ) : undefined}
            </Snackbar>
        </>
    );
}
