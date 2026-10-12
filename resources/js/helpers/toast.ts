// Toasts from anywhere (AppFeedback shows them): toast.success("Saved."), toast.error(…), toast.warning(…), toast.info(…).
// Server results already toast themselves (flash messages, validation errors, failures); use this for client-side ones.
export type ToastSeverity = "success" | "error" | "warning" | "info";

export interface ToastMessage {
    severity: ToastSeverity;
    message: string;
}

export const TOAST_EVENT = "lr-toast";

const show = (severity: ToastSeverity) => (message: string) => window.dispatchEvent(new CustomEvent<ToastMessage>(TOAST_EVENT, { detail: { severity, message } }));

export const toast = {
    success: show("success"),
    error: show("error"),
    warning: show("warning"),
    info: show("info"),
};
