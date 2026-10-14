import { echo, echoIsConfigured } from "@laravel/echo-react";
import type { AuthorizerCallback } from "pusher-js";

export const PRESENCE_CHANNEL = "portal.online";

export interface PresenceMember {
    id: number;
    name: string;
    avatar: string | null;
    role: string | null;
}

export interface PresenceSnapshot {
    // False until the socket is connected and the channel joined; callers fall back to polled data.
    live: boolean;
    members: Map<number, PresenceMember>;
}

// One subscription for the whole tab, kept outside React so page visits (which remount layouts)
// don't leave and rejoin the channel and make everyone flicker offline.
let joined = false;
let snapshot: PresenceSnapshot = { live: false, members: new Map() };
const listeners = new Set<() => void>();

const publish = (next: Partial<PresenceSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    listeners.forEach((listener) => listener());
};

export const readCookie = (name: string) =>
    decodeURIComponent(document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))?.split("=")[1] ?? "");

// Laravel rotates the CSRF token at sign-in without a full page load, so a token captured at boot
// would be stale; read the XSRF cookie fresh for every channel authorization instead.
export function presenceAuthorizer(channel: { name: string }) {
    return {
        authorize: (socketId: string, callback: AuthorizerCallback) => {
            fetch("/broadcasting/auth", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                    "X-XSRF-TOKEN": readCookie("XSRF-TOKEN"),
                },
                body: JSON.stringify({ socket_id: socketId, channel_name: channel.name }),
            })
                .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`Presence auth failed (${res.status})`))))
                .then((data) => callback(null, data))
                .catch((error) => callback(error, null));
        },
    };
}

export function joinPresence(): void {
    if (joined || !echoIsConfigured()) return;
    joined = true;

    try {
        const instance = echo();
        const pusher = (instance.connector as { pusher?: { connection: { bind: (e: string, cb: (s: { current: string }) => void) => void } } }).pusher;

        // When the socket drops, the member list is stale; Pusher rejoins (and re-runs `here`) on reconnect.
        pusher?.connection.bind("state_change", ({ current }) => {
            if (current !== "connected") publish({ live: false });
        });

        instance
            .join(PRESENCE_CHANNEL)
            .here((members: PresenceMember[]) => publish({ live: true, members: new Map(members.map((m) => [m.id, m])) }))
            .joining((member: PresenceMember) => publish({ members: new Map(snapshot.members).set(member.id, member) }))
            .leaving((member: PresenceMember) => {
                const members = new Map(snapshot.members);
                members.delete(member.id);
                publish({ members });
            })
            .error(() => publish({ live: false }));
    } catch {
        // No socket server (e.g. Reverb not running): stay on the polled list.
        joined = false;
    }
}

export function leavePresence(): void {
    if (!joined) return;
    joined = false;
    try {
        echo().leave(PRESENCE_CHANNEL);
    } finally {
        publish({ live: false, members: new Map() });
    }
}

export function subscribePresence(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function getPresenceSnapshot(): PresenceSnapshot {
    return snapshot;
}
