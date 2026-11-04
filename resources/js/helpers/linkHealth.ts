import { ShortLinkHealth } from "../types/app-data-types";

const TRACKING = /^(utm_|fbclid$|gclid$|dclid$|msclkid$|igshid$|mc_|_hs|yclid$|ref$|ref_|src$|si$)/i;

// A pasted address without a scheme is taken as https, as the server does.
export function normalizeLink(raw: string): string {
    const url = raw.trim();
    if (!url) return "";
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`;
}

// Does this address read as a clean, human slug (example.com/open-house-cebu), or as something machine-made that people
// hesitate to scan? Each reason is a short phrase to show.
export function assessLink(raw: string): ShortLinkHealth {
    const normalized = normalizeLink(raw);
    let url: URL;
    try {
        url = new URL(normalized);
    } catch {
        return { valid: false, clean: false, reasons: [], host: null, length: normalized.length };
    }
    if (!/^https?:$/.test(url.protocol) || !url.hostname.includes(".")) {
        return { valid: false, clean: false, reasons: [], host: null, length: normalized.length };
    }

    const reasons: string[] = [];
    const params = [...url.searchParams.keys()];
    const tracking = params.filter((k) => TRACKING.test(k));
    if (tracking.length) {
        reasons.push(`carries tracking codes (${tracking.slice(0, 2).join(", ")}${tracking.length > 2 ? "…" : ""})`);
    } else if (params.length) {
        reasons.push(`has ${params.length === 1 ? "a query string" : `${params.length} query parameters`} after a “?”`);
    }
    const segments = url.pathname.split("/").filter(Boolean);
    const machine = segments.find((s) => s.length >= 32 || (s.length >= 16 && /\d/.test(s) && /[a-z]/i.test(s) && !/[-_]/.test(s)));
    if (machine) {
        reasons.push("contains a machine-made code instead of words");
    }
    if (/%[0-9a-f]{2}/i.test(url.pathname + url.search)) {
        reasons.push("has encoded characters like %20");
    }
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname) || url.port) {
        reasons.push("points at a raw server address");
    }
    if (segments.length >= 4) {
        reasons.push("is nested several folders deep");
    }
    if (normalized.length > 60) {
        reasons.push(`is ${normalized.length} characters long`);
    }

    return { valid: true, clean: reasons.length === 0, reasons, host: url.hostname, length: normalized.length };
}
