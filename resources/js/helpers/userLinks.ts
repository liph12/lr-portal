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

// Personal share links, shown in the "LR | route" shorthand with the real path in `href` (Copy / Share use it): the
// registration link the server made (/register?ref={their referral code}; + &type=international for a Global Partner),
// and the business profile and contact page on the slug the server assigned. All are missing only until the account has an
// agent record.
export function buildUserLinks(user: AuthUser): UserLink[] {
    // The server's link is absolute (APP_URL); the card keeps this site's path, like the others.
    const referralUrl = user.referral_url ? new URL(user.referral_url, window.location.origin) : null;
    const referral = referralUrl ? `${referralUrl.pathname}${referralUrl.search}` : null;

    return [
        ...(referral
            ? [
                  { label: "Local Referral", url: `LR | ${referral.slice(1)}`, href: referral },
                  { label: "Global Referral", url: `LR | ${referral.slice(1)}&type=international`, href: `${referral}&type=international` },
              ]
            : []),
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
