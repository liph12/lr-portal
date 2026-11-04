---
title: Dashboard
tags: [dashboard]
---

# Dashboard

Shared dashboard, My Sales, Overview, partner & dashboard posters, LR ID, QR Code Maker & short links. Related: [[reports]] · [[profile]] · back to [[README|index]].

- **Dashboard (shared)**: `/dashboard/{main,overview,view-sales,record-sale/...}` (`routes/dashboard.php`,
  `Portal\DashboardController`, pages in `Pages/Portal/Dashboard/`) is the **same for every role** and is
  everyone's home (`User::homeUrl()` → `dashboard.index`; old `/superadmin/dashboard/*`, `/admin/dashboard`,
  `/staff/dashboard` redirect there). Menus reuse one `dashboardRoute` node in `app-data.tsx`; roles
  without a portal (agent, team leader, unit manager…) get `memberRoutes`. **Record Your Sale** is the only
  gated part: `record_sales` permission (`AgentTransactionPolicy::create`; granted to agent, team_leader,
  unit_manager; superadmin always) — hide UI with `auth.permissions`. Its only entry point is the sidebar button
  (`SidebarProfile`); the dashboard node carries `tab: false`, so it's in breadcrumbs / search but not the tab bar. Field roles' sales are credited to
  their own agent (`SaleRecord::creditedAgent`); back-office recorders stay `recorded_by` only.
- **Dashboard › My Sales** (`/dashboard/my-sales`, `DashboardController::mySales`, tab for anyone with an agent record —
  pseudo-grant `_agent` from `auth.agent_id`): the agent's own sales one by one (`ReportSaleList` with a Type column, no Agent
  column; `lockedFilters` with `['agent_id' => own]`, so the URL can't point it elsewhere), click → read-only details, then
  `ReportStatistics`. Above the list, `SalesTotals`: total + project / brokerage / rental (`totals` prop,
  `SalesReportService::categoryTotals` — every category whatever is picked; a tile picks its category). People search rows show a **sales counter** (`details.sales`: valid + pending, international too).
- **Dashboard › Overview = sales at a glance** (`DashboardController::overview`, same reach as reports: back office the
  whole system with top teams; team leader their team with top sub-teams; unit manager their sub-team; others 403): date
  range, top 5 agents / groups, then `ReportStatistics`.
- **Partner posters** (`components/dashboard/PartnerPosters`, in `AppLayout` under the navbar — every signed-in page, every user):
  a slim strip, Filipino Homes (post brokerage properties) beside Rent.ph (post rental properties), one at a time on phones, in
  their own colours (`--lr-brand-fh-*`, `--lr-brand-rentph-*`, the same in both
  schemes) with their logos (Filipino Homes white, `onboarding/fh-logo-white.png`; Rent.ph the full-colour `rentph-logo-tagline.png` on a slanted light panel `--lr-brand-rentph-logo-bg` so its blue lettering reads on the navy); external links (`url` in `POSTERS`), new tab.
- **Dashboard posters** (announcements; Settings › Dashboard posters `/superadmin/settings/posters`, superadmin only —
  `SuperAdmin\Settings\PosterController`, `DashboardPosterService`, `dashboard_posters` migration `000054`, `Save/Toggle/Reorder/DeletePosterRequest`):
  title, image (compressed in the browser, then by `FileCompressionService`, stored on the photos disk under `posters/`; a replaced
  or deleted image is removed), optional link (an in-app path → Inertia, or https → new tab), optional show-from / until dates,
  on/off, order. Dashboard › Main gets `posters` (`showing()`: on and within dates, in order) and shows them edge to edge beside
  the welcome as `components/dashboard/PosterCarousel` (slides every 6 s, pauses on hover / reduced motion, arrows + corner dots
  when more than one; nothing when there are none). Best at 1200 × 515. The first row is the NATCON 2026 poster
  (`public/assets/posters/natcon-2026-banner.jpg`).
- **Dashboard › Generate LR ID** (`/dashboard/lr-id`, `DashboardController::lrId`, `Pages/Portal/Dashboard/LrId/Index.tsx` outside AppLayout under `PublicHeader` like the business profile, as one ID Preview panel (Flip + CR80 tag in its header): the collapsible Profile Photo / Cardholder
  Signature sections (Added / Required chip) on the left, the sticky card preview + Download / Flip / Policy on the right — the dashboard's tokens and pill `StyledButton`s — opened from the Tools & apps card; route node `tab: false`): the official agent ID card, a port of the old online generator (agentid.vercel.app).
  `LrIdService::card` supplies the name parts in capitals (`first_name`, `middle_name` or null, `last_name`; the page prints "FIRST [MIDDLE] LAST", a checkbox leaves the middle name off) / title (`ContactLinkService::card`), the agent id as the ID number (no separate member id exists), the
  public profile URL for the QR and an expiry one year out; `helpers/lrIdCard.ts` draws each side on a 1050 × 1650 canvas (templates
  `resources/assets/lr-id-{front,back}.png`, stretched like the old generator did; photo clipped to the front's round window (drawn in code: the template has no circle, `PHOTO_WINDOW` r 232, thin white border + drop shadow), name in capitals ≤ 71px
  bold Arial centred at y 835, ID no. at (352, 1435), dots QR at (280, 865) 500px; back: signature box 450 × 130 at (300, 120), expiry
  DD-MMM-YYYY at (515, 1448)). Photo = profile photo via the same-origin proxy `GET /dashboard/lr-id/photo` (`LrIdService::photo`, S3 /
  legacy URLs would taint the canvas) or an upload; Remove Photo, a live preview of the card around the photo window (`WINDOW_VIEW` viewport, 640px square; same outline + corner handles as the big preview, drag anywhere) with − % + zoom (50–300%), Center / Reset / Expand (a larger round editor dialog with pinch-to-zoom); tapping the photo or signature on the preview (`CardCanvas`) selects it — dotted outline with **corner handles that resize it** (`onResize`, proportions kept, opposite corner fixed), window guide — and drags it; once selected the wheel / pinch zooms about the window's centre, arrow keys nudge (Shift ×5), double-click centres, a drag near the centre snaps; signature drawn (`SignaturePad` `ink` / `hint` props) or
  uploaded (drawn on `SignaturePad` with `showFooter={false}` / `height`, applied with its own Clear / Apply buttons, or on the larger
  "Touch Expand" pad dialog). Download = both sides as two 2× PNG files after the terms dialog (shown on arrival, and again as a confirmation before every download; no print button, no zip); it posts
  `POST /dashboard/lr-id/downloaded` (`LogLrIdDownloadRequest`) → activity `lr_id.downloaded`. Tests: `tests/Feature/LrIdTest.php`.
- **Dashboard › QR Code Maker** (`/dashboard/qr-maker`, `Portal\QrMakerController::index`, `Pages/Portal/Dashboard/QrMaker/Index.tsx` outside AppLayout
  under `PublicHeader` like Generate LR ID — its own scroller, no sidebar / rail; opened from the Tools & apps card, route node `tab: false`): a QR code for any web address, drawn in the browser
  by `components/utils/StyledQrCode.tsx` over `helpers/qrArt.ts` (one SVG path per layer: modules **square / rounded / dots**, eyes
  **square / rounded / circle**, any code / eye / background colour incl. transparent, error correction not offered: level M, or H when the mark is on; a fixed 2-module quiet zone — the
  Filipino Homes pin `assets/qr-logo.png` ("FH mark") in the middle forces H and clears the modules under it). Every shape × eye × logo combination was verified
  to decode with ZXing (phone cameras) and, apart from dots, jsQR; colours are literal (what the camera sees), and
  `qrReadability` warns below 3:1 contrast or when the code is lighter than its background. Download = PNG (one size, 1024 px: the SVG
  rasterised on a canvas with the logo embedded as a data URL) or SVG (`helpers/qrExport.ts`).
  **Short links** (`short_links` migration `000058`, `Entities\ShortLink`, `ShortLinkService`, `ShortLinkPolicy` — anyone signed in
  creates, only the owner deletes; `Requests/Portal/QrMaker/{Store,Delete}ShortLinkRequest`): every code goes **through a short LR link** (no
  switch: the agent asked for every scan to be counted and for people to see Leuterio Realty's address first), so the preview is
  empty until the short link exists; `helpers/linkHealth.ts` only validates the address now (its slug heuristics stay for reuse).
  Creating one
  (`POST /dashboard/qr-maker/links`: `url` — https assumed when no scheme, http(s) only, never one of our own `/url/` links; optional
  `alias` 3–40 chars `[a-z0-9-]`, unique, not in `ShortLinkService::RESERVED`; optional `title`) returns `back()` with the short URL
  in the flash; without an alias a 6-character code from an unambiguous alphabet, and the same address is reused rather than
  shortened twice. The QR then encodes `url('/url/{code}')`; **public** `GET /url/{code}` (`routes/short-links.php`, outside auth,
  `QrMakerController::open`) 302s to the address and counts `clicks` / `last_clicked_at`. "Your short links" lists the newest 50 with
  visits, Make QR / copy / remove (`ConfirmDialog`, `DELETE /dashboard/qr-maker/links/{link}`). Activity: `short_link.created` /
  `short_link.deleted`. Tests: `tests/Feature/QrMakerTest.php`.
