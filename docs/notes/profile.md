---
title: Profile, business profile & preferences
tags: [profile, preferences]
---

# Profile, business profile & preferences

/profile, avatars, business profile & contact page, Settings › Preferences. Related: [[dashboard]] · back to [[README|index]].

- **Profile / avatars**: `/profile` is shared by every role (`routes/profile.php`, required inside the
  `auth` group; `Portal\ProfileController`). A user's agent record is created on first use by
  `ProfileService::agentFor()`. Photos are **cropped in the browser first** (`components/utils/user/PhotoCropper`: square, round guide, drag / scroll /
  pinch / slider / arrow keys, 1024px JPEG; used by `ProfilePhotoCard` everywhere), then made 512px WebP by `ProfilePhotoService` and the full
  URL is stored in `agents.avatar` (shared as `auth.avatar`). Render people with
  `components/utils/user/UserAvatar.tsx` (photo, falling back to initials). Titled panels: `components/cards/SectionCard.tsx`.
- **Business profile & contact page** (public, `routes/contact.php` required **outside** the `auth` group; `Portal\ContactController`;
  pages outside `AppLayout` that scroll themselves like the auth pages, with the reduced navbar `components/layouts/PublicHeader.tsx`
  — logo, Dashboard / Sign out for a signed-in user, Sign in otherwise). **Business profile** `/business-profile/{slug}`
  (`Pages/BusinessProfile/Show.tsx`, `ContactLinkService::profile`): a social-media-style profile — cover, avatar, name, title,
  area, year joined, About me (`agent_profiles.about`, text), contact details, social buttons (`agent_profiles.facebook`
  cleaned by `SocialLinks::facebook`, `instagram` / `twitter` / `linkedin` by `ContactLinkService::link`, `whatsapp` → `api.whatsapp.com/send?phone=` (not wa.me: some networks intercept its certificate)
  with `whatsapp()`; edited on its own page `/profile/business` — `ProfileController::business/updateBusiness`,
  `UpdateBusinessProfileRequest`, `ProfileService::updateBusiness` (logged `profile.business_updated`), `Pages/Profile/Business.tsx` +
  `forms/BusinessProfileForm.tsx` (About me, mobile, Facebook/Instagram/X/LinkedIn links, WhatsApp, and **My Links** = `agent_profiles.links` JSON `[{label, url}]`, max 10, `links.*.label` / `links.*.url` rules, cleaned for the card by `ContactLinkService::links`, shown under the action buttons as globe cards — only on the business form) — the same fields also stay in the main `/profile` form (`ProfileDetailsForm` › Business profile group); both write the same columns, so they are always in sync), Save contact + Send inquiry.
  **Contact page** `/contact/{slug}` (`Pages/Contact/Show.tsx`): the agent card (name, title — "Licensed Real
  Estate Broker" when `is_broker` —, avatar, mobile, email, city + province, "Save contact" = `GET …/vcard`) and the inquiry form
  (`POST …`, throttled, `StoreContactInquiryRequest`, consent box `accepted`) → `contact_inquiries` (`ContactInquiry`, `ROLES` /
  `TYPES` constants are the two dropdowns; `ContactInquiryService::submit`, logged `contact.inquiry`) and **emailed to the agent**
  (`Mail\ContactInquiryReceived`, queued, markdown `views/mail/contact-inquiry`, reply-to = the sender; needs `MAIL_MAILER` — the
  legacy `MAIL_DRIVER` key is ignored). Nobody reads inquiries in the app yet (Inbox is under construction). **Slug** = `agents.contact_slug` (unique), made by
  `ContactLinkService::slugFor` from first + last name the first time it's needed, `-2`, `-3`… on duplicates, and **never changed
  afterwards** (shared links keep working after a rename). Shared as `auth.contact_slug` (null until the account has an agent record —
  `DashboardController::index` creates one like `/profile`); Dashboard › Your links shows both as `LR | route` like the referral links
  (`helpers/userLinks.ts`: `url` is the shown text, `href` the real path that Copy / Share prefix with the origin, `settings` adds a gear
  button → `/profile/business`). Only agents whose account is `active` resolve; others 404.
  The public name is first + last only (`ContactLinkService::displayName`; the middle name stays in the vCard `N` field). The business profile follows the Leuterio mock: blue `--lr-primary*` accent, two columns from `md` (avatar with red ring + name + verified mark + chips "Leuterio Realty & Brokerage" / province (`profile()['province']` = title-cased `agents.state`) / "Filipino Homes", About Me, Contact me / Save card / Share; right: QR + "Connect with me" badges panel, Contact Information cards that open tel: / mailto: / Google Maps (WhatsApp is only a social badge)), stacked on phones. Social badges use the scheme-independent `--lr-brand-*` tokens in app.css (official brand colours, white mark); the Twitter field is shown as X. QR codes: `components/utils/DotsQrCode.tsx` (round dots + rounded eyes, module grid from the `qrcode` package; `logo` = the pin `assets/qr-logo.png` in the middle at 30% height — level H, dots under it left out — verified with jsQR; tapping the card's QR opens the share dialog). Share opens `ShareCardDialog` (QR + share-to links for Facebook / LinkedIn / X / WhatsApp + copy link).
- **Settings › Preferences** (`/settings/preferences`, `routes/settings.php`, `Portal\PreferencesController`,
  `UserPreferenceService`; every user, gated by permission `use_preferences` — migration `000036` gave it to every role, a
  role made later has it only if ticked): `users.preferences` = `{theme, font_size, links: {default, sections}}`
  (`User::THEMES` / `FONT_SIZES` / `LINK_MODES`, read with `User::preferences()`), one form (`forms/PreferencesForm.tsx`,
  `PUT /settings/preferences`, `UpdatePreferencesRequest`); shared as `auth.preferences` (null without the permission =
  defaults). Menu: a Preferences child in the superadmin's Settings + card on its index; `settingsRoute` for everyone else.
  **Theme** follows the account: `hooks/useAppearance.ts` (in `AppLayout`) sets `useColorScheme` from it, and the navbar
  switch saves too (`PUT /settings/preferences/theme`, `UpdateThemeRequest`). **Text size** is a zoom of the whole page
  (`helpers/appearance.ts`: `--lr-zoom` on `<html>`, `body { zoom }` in app.css, pre-paint from `localStorage['lr-font-size']`)
  because sizes here are mostly px — so `AppLayout` fills the page by `height: 100%` (html → body → `#app`), never `100vh`.
  **Links** (same tab = SPA / new tab, overall + per top-level menu path): enforced in one place — `hooks/useLinkBehaviour.ts`
  cancels an Inertia GET to another path and opens it in a new tab (`helpers/linkBehaviour.ts`: the destination's section
  decides; pages outside the menu follow the page they're opened from). On the same path, filters (`preserveState`), partial
  reloads and steps back (query values only dropped/kept) stay in place; a step deeper without `preserveState` (Sales validation
  area → category) counts as a page, so keep using Inertia `Link` / `router` — never `target="_blank"` or `window.open` for page links.
