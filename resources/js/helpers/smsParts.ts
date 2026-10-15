// Mirrors App\Support\SmsText: SMS parts of a message (each part to each number = one credit) and mobile number parsing.
const GSM = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXTENDED = "^{}\\[~]|€";

export interface SmsLength {
    parts: number;
    // Characters used, and how many fit before the next part starts.
    length: number;
    limit: number;
    unicode: boolean;
}

export function smsLength(message: string): SmsLength {
    const chars = Array.from(message);
    let length = 0;
    for (const c of chars) {
        if (GSM_EXTENDED.includes(c)) length += 2;
        else if (GSM.includes(c)) length += 1;
        else {
            const n = chars.length;
            const parts = n === 0 ? 0 : n <= 70 ? 1 : Math.ceil(n / 67);
            return { parts, length: n, limit: parts <= 1 ? 70 : parts * 67, unicode: true };
        }
    }
    const parts = length === 0 ? 0 : length <= 160 ? 1 : Math.ceil(length / 153);
    return { parts, length, limit: parts <= 1 ? 160 : parts * 153, unicode: false };
}

export function mobileNumber(value: string): string | null {
    const digits = (value.split(/[/,;]/)[0] ?? "").replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("09")) return digits;
    if (digits.length === 12 && digits.startsWith("639")) return `0${digits.slice(2)}`;
    if (digits.length === 10 && digits.startsWith("9")) return `0${digits}`;
    return null;
}

export function parseNumbers(text: string): { valid: string[]; invalid: string[] } {
    const valid = new Set<string>();
    const invalid: string[] = [];
    // Commas, semicolons and new lines separate numbers; spaces may sit inside one ("0917 123 4567") or between several.
    for (const token of text.trim().split(/[,;\r\n]+/).filter((t) => t.trim())) {
        const whole = mobileNumber(token);
        if (whole) {
            valid.add(whole);
            continue;
        }
        for (const raw of token.trim().split(/\s+/).filter(Boolean)) {
            const n = mobileNumber(raw);
            if (n) valid.add(n);
            else invalid.push(raw);
        }
    }
    return { valid: [...valid], invalid };
}
