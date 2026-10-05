const AVATAR_COLORS = ["#1a73e8", "#188038", "#d93025", "#e37400", "#9334e6", "#007b83", "#c5221f", "#1967d2"];

export function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.charAt(0) ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
    return (first + last).toUpperCase();
}

// Hash the name so each person keeps the same color across sessions.
export function getAvatarColor(name: string): string {
    let hash = 0;
    for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
