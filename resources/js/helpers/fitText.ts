// A font size that keeps a figure on one line inside its card (the card needs `containerType: "inline-size"`): its usual
// size, or smaller when the text wouldn't fit the card's width (Google Sans Code: ~0.62em a character). Follows the
// Preferences text size, like every other font size.
export function fitFontSize(text: string, maxPx: number): string {
    const ems = (Math.max(text.length, 4) * 0.62).toFixed(2);

    return `min(calc(${maxPx}px * var(--lr-text-scale, 1)), calc(100cqi / ${ems}))`;
}
