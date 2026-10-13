import { AuthUser } from "../types";

export interface UserLink {
    label: string;
    url: string;
}

// Personal share links. Local Referral is the registration link the server made (/register?ref={their referral code});
// Global Referral the same link for a Global Partner (&type=international). The contact page is the /contact/{slug} link
// the server assigned (both are missing only until the account has an agent record).
export function buildUserLinks(user: AuthUser): UserLink[] {
    return [
        ...(user.referral_url ? [{ label: "Local Referral", url: user.referral_url }] : []),
        ...(user.referral_url ? [{ label: "Global Referral", url: `${user.referral_url}&type=international` }] : []),
        { label: "Business Profile", url: `LR | business-card?email=${user.email}` },
        ...(user.contact_url ? [{ label: "Contact", url: user.contact_url }] : []),
    ];
}
