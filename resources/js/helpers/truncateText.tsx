export const truncate = (text: string, maxLength = 50) =>
    text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
