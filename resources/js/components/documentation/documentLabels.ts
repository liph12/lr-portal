export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
    prc: "PRC ID",
    dhsud: "DHSUD",
    contract: "Contract",
    cpd: "CPD certificate",
    new_entry: "New entry",
};

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
    pending: "Pending",
    valid: "Valid",
    for_reupload: "For re-upload",
};

// Photos are previewed inline; PDFs and Word files open in a new tab.
export const isImageFile = (url: string) => /\.(jpe?g|png|gif|webp|jfif)(\?|$)/i.test(url);
