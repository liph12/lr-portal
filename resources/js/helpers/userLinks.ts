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

// Personal share links. The portal's user id stands in for the referral/contact number until agents
// get their own referral ids (agent_attributes.referral_id).
export function buildUserLinks(user: AuthUser): UserLink[] {
    return [
        { label: "Local Referral", url: `LR | registration/v2?ref=${user.id}` },
        { label: "Global Referral", url: `LR | registration/v2?ref=${user.id}&type=international` },
        { label: "Business Profile", url: `LR | business-card?email=${user.email}` },
        { label: "Contact", url: `LR | contact/${user.id}/${slugify(user.name)}` },
    ];
}
