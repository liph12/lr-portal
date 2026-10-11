// Visually hidden but read by screen readers: each chart ships its data as a table this way.
export const srOnly = {
    position: "absolute",
    width: 1,
    height: 1,
    p: 0,
    m: -1,
    overflow: "hidden",
    clip: "rect(0 0 0 0)",
    whiteSpace: "nowrap",
    border: 0,
} as const;
