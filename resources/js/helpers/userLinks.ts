import { AuthUser } from "../types";

export interface UserLink {
    label: string;
    url: string;
}

const slugify = (name: string) =>
    name
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

// Personal share links. The referral number is the agent id (an imported agent's legacy member id);
// accounts without an agent profile fall back to their user id.
export function buildUserLinks(user: AuthUser): UserLink[] {
    const ref = user.agent_id ?? user.id;

    return [
        { label: "Local Referral", url: `LR | registration/v2?ref=${ref}` },
        { label: "Global Referral", url: `LR | registration/v2?ref=${ref}&type=international` },
        { label: "Business Profile", url: `LR | business-card?email=${user.email}` },
        { label: "Contact", url: `LR | contact/${ref}/${slugify(user.name)}` },
    ];
}
