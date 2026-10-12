import { AuthUser } from "../types";

export interface UserLink {
    label: string;
    url: string;
}

// Personal share links. The referral number is the agent id (an imported agent's legacy member id);
// accounts without an agent profile fall back to their user id. The contact page is the real
// /contact/{slug} link the server assigned (it's missing only until the account has an agent record).
export function buildUserLinks(user: AuthUser): UserLink[] {
    const ref = user.agent_id ?? user.id;

    return [
        { label: "Local Referral", url: `LR | registration/v2?ref=${ref}` },
        { label: "Global Referral", url: `LR | registration/v2?ref=${ref}&type=international` },
        { label: "Business Profile", url: `LR | business-card?email=${user.email}` },
        ...(user.contact_url ? [{ label: "Contact", url: user.contact_url }] : []),
    ];
}
