import { AuthUser } from "../types";

export interface UserLink {
    label: string;
    // What the card shows (and copies when there is no href).
    url: string;
    // The real path on this site, when the shown text is the "LR | …" shorthand.
    href?: string;
    // Where the "Settings" button on the card goes.
    settings?: string;
}

// Personal share links. The referral number is the agent id (an imported agent's legacy member id);
// accounts without an agent profile fall back to their user id. The business profile and contact page
// are real routes on the slug the server assigned (missing only until the account has an agent record), shown in the
// same "LR | route" shorthand as the referral links; Copy / Share use the real path.
export function buildUserLinks(user: AuthUser): UserLink[] {
    const ref = user.agent_id ?? user.id;

    return [
        { label: "Local Referral", url: `LR | registration/v2?ref=${ref}` },
        { label: "Global Referral", url: `LR | registration/v2?ref=${ref}&type=international` },
        ...(user.contact_slug
            ? [
                  {
                      label: "Business Profile",
                      url: `LR | business-profile/${user.contact_slug}`,
                      href: `/business-profile/${user.contact_slug}`,
                      settings: "/profile/business",
                  },
                  { label: "Contact", url: `LR | contact/${user.contact_slug}`, href: `/contact/${user.contact_slug}` },
              ]
            : []),
    ];
}
