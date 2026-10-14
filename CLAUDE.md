# CLAUDE.md — lr-portal

Rules for working in this repo. Full architecture survey: `docs/ARCHITECTURE.md`.
Where existing code conflicts with §4, the rules win — §5 lists what not to copy.

## 1. Stack & directory map

Laravel 12 (PHP ^8.2) · Inertia 2 · React 19 + TypeScript · MUI v7 · Vite 7.
Session auth (`web` guard), single MySQL connection. **No `routes/api.php`** — all data flows as
Inertia page props over web routes. Entry: `resources/js/app.tsx` (wired in `vite.config.js:8`
and `resources/views/app.blade.php:5` — the only Blade file).

```
app/
  Http/Controllers/Portal/{Admin,SuperAdmin}/   one controller per portal section
  Http/Controllers/Portal/SuperAdmin/Reports/   feature grouping inside a portal
  Http/Middleware/                              HandleInertiaRequests, RoleMiddleware
  Models/            RBAC (User, Role, Permission);  Models/Entities/  domain models
  Services/          business logic (AuthUserService.php)
routes/
  web.php            guest/auth groups; requires the per-section files below
  superadmin/superadmin-{section}.php,  admin/admin-{section}.php,  staff/staff-{section}.php
resources/js/
  Pages/             one component per inertia('...') string, path mirrors the string
  components/        AppNavbar, AppSidebar;  layouts/  cards/  utils/{forms,tables,user}/
  hooks/  helpers/  providers/  types/
```

## 1a. Commands

```
composer setup        # first run: install, .env, key, migrate, npm build
composer dev          # serve + queue + pail logs + vite; serve loads dev/php/*.ini (20MB uploads)
npm run build         # production build (doesn't type-check)
npx -y -p typescript@5.9 tsc --noEmit -p tsconfig.json --strictNullChecks   # type-check, as strict as VS Code (0 errors)
composer test         # Pest (tests/ holds only the default examples)
php artisan migrate --seed   # MySQL db `lr_portal`; seeders: roles, permissions, users, developers
```

## 2. Reference implementation — copy this flow

`GET /dashboard/record-sale/project`, end to end:

1. **Route** — `routes/dashboard.php`, named `dashboard.record-sale.project`, inside the shared
   `prefix('dashboard')` group (every signed-in role) behind `can:create,AgentTransaction` (`record_sales`).
2. **Controller** — `app/Http/Controllers/Portal/Sales/SaleController.php`:
   `recordProject()` → `inertia('Portal/Dashboard/RecordSale/Project', ['developers' => ...])`.
   Always the lowercase `inertia()` helper — `Inertia::render` is not used in this codebase.
3. **Page** — `resources/js/Pages/Portal/Dashboard/RecordSale/Project.tsx`: typed destructured
   props (`{ developers }: { developers: SalesSource[] }`), persistent layout via
   `Project.layout = (page: ReactNode) => <DashboardLayout children={page} />` (line 20),
   `export default Project;` at the bottom.
4. **Resolution** — `resources/js/app.tsx:6-9`: exact, case-sensitive glob key
   `./Pages/${name}.tsx`. The `inertia('...')` string and the file path must match exactly.

New page = route in the section file + method on the section controller + `Pages/` component
at the matching path. Nothing else.

## 3. Conventions in actual use (docs/ARCHITECTURE.md §4)

- Controllers: `App\Http\Controllers\Portal\{Role}\...`, `{Name}Controller`, camelCase methods.
- Route names: `{role}.{section}.{action}` dot-notation; section index pages `{role}.{section}.index`
  (e.g. `superadmin.management.index`). Route files: `routes/{role}/{role}-{section}.php`.
- Services: `{Name}Service` in `app/Services/`, constructor-injected (`UserController.php:13-16`).
- Section headings: `components/utils/SectionTitle.tsx` (title, subtitle, optional action).
- Pages/components: PascalCase `.tsx`, one component per file, **default export**.
  Pages use `Index.tsx`.
- Hooks: `hooks/use{Thing}.ts`, default export (`hooks/useBreadcrumbs.ts`).
  Helpers: `helpers/{camelCase}.ts`, **named** exports (`helpers/routeMatch.ts`).
- Props: inline `interface {X}Props` in the component file; controller props arrive as a typed
  destructured argument — `usePage().props` is not used for page props.
- Imports: deep relative paths; no `@/` alias exists in `tsconfig.json`.
- Shared Inertia props available on every page: `errors` + `auth` (see §4 Auth props / §5).

## 4. Rules for new code

- **Styling**: MUI `sx` prop only, following the wrapper style of
  `resources/js/components/utils/StyledButton.tsx` (spread props, merge caller `sx` last).
  Do **not** add Tailwind classes or styled-components/`styled()` — both are installed but
  unused (`docs/ARCHITECTURE.md` §6); keep it that way.
  Inputs: `components/utils/StyledTextField.tsx` / `StyledAutocomplete.tsx` (filled, token-coloured) with the label printed
  above in `FormHelperText` — as in the record-sale forms and the Sales validation sale form. Don't use bare MUI
  `TextField`/`Autocomplete` in forms.
- **Colors / dark mode**: never hardcode hex in components — use the `var(--lr-*)` tokens from
  `resources/css/app.css` (`--lr-text-primary`, `--lr-surface`, `--lr-border`, `--lr-primary`, …),
  which flip under `html.dark`. MUI's palette (`providers/appTheme.ts`) mirrors them — change both
  together. Mode is `useColorScheme()` (`components/utils/ThemeModeToggle.tsx`), stored in
  `localStorage['lr-theme-mode']` and applied pre-paint by the script in `app.blade.php`.
  Logos: use `components/utils/AppLogo.tsx` (swaps to the white logo in dark mode).
- **Validation**: a Form Request in `app/Http/Requests/{Role}/` for **every non-GET route**.
  No inline `$request->validate()`. Example: `Requests/Portal/Sales/StoreProjectSaleRequest.php` (shared routes use `Requests/Portal/`).
- **Authorization**: Policies in `app/Policies/` (auto-discovered, e.g. `AgentTransactionPolicy`),
  checked from the Form Request's `authorize()` or `Gate::authorize()` — the base `Controller`
  has no `AuthorizesRequests` trait.
  `RoleMiddleware` aborts 403, which `bootstrap/app.php` renders as the Inertia `Error` page
  (403/404/500/503; JSON callers still get JSON). **A refused Inertia write** (non-GET) is instead sent `back(303)` with a
  `flash.error` toast: as an Error page it would take the write's URL (e.g. `/impersonate`), and the next reload of the
  current page (online-users poll, tables) would GET a write-only route → 405.
- **Layouts**: persistent `.layout` static pattern only
  (`Project.layout = (page) => <DashboardLayout children={page} />`, `RecordSale/Project.tsx:20`).
  Never wrap a layout inside the page's render. `AppLayout` owns the viewport (`100vh`,
  `overflow: hidden`) and its `<main>` pane is the only page scroller — pages must not set
  `100vh` heights or their own `overflowY`. Below `lg` the sidebar becomes a `Drawer` opened from
  the navbar menu button. `AppLayout` also renders the right rail (`layouts/SideRail.tsx`: online
  users + leaderboards) on **every** signed-in route — a fixed column on `lg+`, leaderboards stacked
  below the page on smaller screens. `DashboardLayout` is just the dashboard tab bar (plus the mobile
  online strip); pages must not render their own copy of the rail.
  Pages outside `AppLayout` (`Pages/User/Auth/*`) scroll themselves: `100dvh` + `overflowY: "auto"`.
- **Auth props**: shared from `app/Http/Middleware/HandleInertiaRequests.php` `share()` **only**
  (`auth` = `{ id, name, email, role }`, role is the first role's label). Read it in components
  with `hooks/useAuthUser.ts` (typed by `SharedProps` in `types/index.ts`). No `Inertia::share` in
  providers; no per-page `'user' => Auth::user()` props.
- **Forms**: `useForm` from `@inertiajs/react` — and actually use its `post/put`, `errors`,
  `processing`, not just `data/setData`. Multi-step forms keep **one** `useForm` in the page and
  pass `data/setData/errors` to step components (`SaleStepProps`); see
  `Pages/SuperAdmin/Dashboard/RecordSale/Project.tsx`.
- **File uploads**: limit is 20MB per original file. Photos are compressed in the browser first
  (`helpers/compressImage.ts`, ≤2400px, q0.8) and again on the server (`FileCompressionService`:
  images resized + re-encoded; PDF/DOC gzipped with `Content-Encoding: gzip` when it saves ≥10%).
  Go through a service, never straight from the controller. Sale documents go through
  `SaleFileStorage` (compress → `config('filesystems.sale_files_disk')`, `SALE_FILES_DISK`, default
  `s3`; returns the **full object URL**; `discardUploaded()` on failure). A project sale has exactly
  **one** `proof_of_transaction` (`ProjectSaleService`). A **rental** (`RentalSaleService`, no developer) is **encoded from the
  Rent.ph Rent Commission Report Slip**: address (`unit_number`), property type, `property_size`, `rental_rate`, duration
  (`duration_value` + `duration_unit` days / months / years, also written as `term_of_payment`), remittance date (stored as both
  dates), amount received → `total_contract_price` = amount / 8.3% (`AgentRentalTransaction::COMMISSION_RATE`); **Rent.ph's 20%
  share is never stored** (worked out: `RentalSaleService::amounts`, `helpers/commissionSlip.ts`); closing agent (required) and
  partner agent by name **and id** — the team and unit manager are **looked up** from the closing agent
  (`RentalSaleService::teamOf`), never stored. A closing agent **with no LR account** is typed in ("Not yet in LR": name,
  email required, mobile) → `closing_agent` + `unregistered_agent_email` / `_mobile` (last 10 digits), `closing_agent_id` and the
  sale's `agent_id` null (credited to them); `UnregisteredAgentLinker` links it when an agent with that email or mobile is created
  (`Agent::created`), or via `php artisan rentals:link-unregistered-agents` after imports; uploads contract, proof of transaction, deposit slip; a Rent.ph-branded slip is
  generated (preview `POST …/rental/slip-preview`). Agents are picked by id via `GET /search/agents` (the second sanctioned
  typeahead endpoint). A brokerage sale (`BrokerageSaleService`) belongs to an active
  `brokerage_areas` row instead of a developer and is **encoded from the Brokerage Commission Report Slip**: the commission
  received (5% fixed, `AgentBrokerageTransaction::COMMISSION_RATE`) gives `total_contract_price` = commission / 5%; the company
  share is 15% or 10% (`COMPANY_SHARE_RATES` → `company_share_rate`, `company_share`); closing / partner agents (by name),
  `signing_broker_id` (an agent with `is_broker`); the **remittance date** is stored as both `remittance_date` and
  `reservation_date` (cutoffs, reports); uploads `contract`, `proof_of_transaction` (photo with the client), `deposit_slip`
  (optional) via `forms/SaleDocumentsForm.tsx` (shared with rental). The **commission slip is generated** (`CommissionSlipImage` with a `brokerage` / `rental` layout, GD + Roboto in
  `resources/fonts/`, stored as `remittance_slip` PNG) with the property owner's name — which is **never stored** (not a
  column, redacted in `config/activity_log.php`, kept out of flashed input in `bootstrap/app.php`). **Preview** before saving:
  `POST /dashboard/record-sale/brokerage/slip-preview` (`PreviewBrokerageSlipRequest`, everything optional) returns the same PNG,
  never stored — `components/sales/CommissionSlipPreview.tsx` (fetch → blob, steps 2–3; rental has its own endpoint). Brokerage and rental slip sales stay pending until
  someone **signs for them** — **separately**: **Brokerage receiving** (`/brokerage-receiving`, `receive_brokerage_sales`) and
  **Rental receiving** (`/rental-receiving`, `receive_rental_sales`) — **back office only** (superadmin / admin / staff; secretaries
  never, migration `000044` took their grants). Filters like Sales validation: remittance dates (default this month; the badges
  count this month), area, and Awaiting / Received / Disapproved. Actions in `CommissionReceiptService` (`CommissionReceiptPanel`):
  **receive** (signature + `received_on`, any past date), **change the received date** later (`PATCH …/received-date`, the slip is
  re-signed: `stampReceived` clears the stub first), **disapprove** a waiting one (`POST …/disapprove`, reason required →
  `disapproved_by/_at`, `disapproval_reason`, sale invalid, red stamp). One route file `routes/commission-receiving.php` registers
  both (the route's `category` default fixes each page), one `CommissionReceivingController` / `CommissionReceivingService` /
  page `Portal/CommissionReceiving/Index` (prop `category`; Awaiting / Received; area reach as Sales validation; a sale only
  opens / is received from its own category's page). Both are Management cards / tabs (`managementCatalog`); the Management menu badge and the cards
  count `auth.commission_receiving.{brokerage,rental}`. The drawer shows the slip and files and a `forms/SignaturePad.tsx` (canvas →
  PNG data URL, `--lr-paper-*` tokens stay light in dark mode); `POST /{brokerage,rental}-receiving/{sale}/receive`
  (`ReceiveCommissionRequest`: a real, non-blank PNG, not already received) stores the signature (`received_signature`),
  sets `received_by` / `received_at`, validates the sale and signs the slip in place (signature + name + date, green
  "Received" pill). Sales validation / report details show the state via `CommissionReceipt` (links to the receiving page).
  Legacy brokerage and rental sales (no `commission_rate`) keep their uploaded remittance slip. Steppers use `hooks/useSaleSteps.ts`
  (never blocks navigation — leaving a step only flags its missing fields; submit checks all). Shared sale rules live in `Requests/Portal/Sales/SaleRequest.php`;
  the shared sale row + client details in `Services/SaleRecord.php`. **Measurements follow the
  property type** (`ProjectPropertyType::WITH_*`, mirrored in `helpers/projectSaleFields.ts`): condo →
  unit type + floor area, house & lot / townhouse → floor + lot area, lot only → lot area; required
  when shown, nulled otherwise; UI via `forms/PropertyMeasurementFields.tsx`. Tests use `Storage::fake('s3')`.
- **Agent registration** (guests; `RegistrationController`, `RegistrationService`, `Requests/Auth/*`) — **"Become a Salesperson"**,
  or with `&type=international` **"Become a Global Partner"** (same steps + a required country outside PH; creates agent_type
  `global_partner`, role `global_partner`, branch `abroad`, sponsor not yet confirmed — it shows as pending in Global Partners;
  `type` kept in the session; dashboard Global Referral = the same link + `&type=international`): from a sponsor's referral
  link `/register?ref={code}` — `agents.referral_code`, 8 random characters made on first use (`Agent::referralCode`), **not** the agent
  id, so counting through ids can't list every agent on the public page (migration `000050`). Shared as `auth.referral_url`
  (Dashboard › Local Referral card, /profile, the agent's profile page; built from `APP_URL`). The
  page shows the sponsor (`SponsorCard`: branch, the team / sub-team they'll join); the visitor ticks "this is my sponsor /
  upline", gives an email (unique) → a **6-digit code** by email (`RegistrationCodeMail`, cached hashed 10 min, 5 tries, resend
  after 60 s, `throttle` on the routes) → `/register/details`: one `useForm` stepper — 1 Basic info, 2 Contact, 3 Address, 4 About
  (education / professions / hobbies from `helpers/registrationOptions.ts` via `StyledMultiAutocomplete`, skills…), 5 Password.
  Creates a **fully registered (4) agent** — local with role `agent`, or a global partner — `referral_id` = sponsor, on the sponsor's team and sub-team
  from today (`AgentUplineService::placementOf`), then signs them in. Progress lives in the session (`registration` = ref, email,
  verified), never in the page. New columns: `agents.birthdate / citizenship / barangay / postal_code`,
  `agent_profiles.education / professions / hobbies` (JSON) — migration `000049`. Mail goes out through `MAIL_MAILER`, or the older `MAIL_DRIVER`
  this project's `.env` uses (`config/mail.php`; port 465 → SSL automatically); without either it's `log`.
- **Onboarding** (new local agents; `OnboardingService`, `RedirectToOnboarding` = route middleware `onboarding` on
  `/dashboard/main` only, `Portal\OnboardingController`, `routes/onboarding.php`, pages `Portal/Onboarding/*` in
  `layouts/OnboardingShell`): a **local, non-back-office agent, fully registered (4), NAO 0, FIRE 0, with no sale at all** (local
  any status, or international) lands on the step they're on (`OnboardingService::nextUrl`) until they finish the steps built so
  far — `OnboardingService::STEPS` (`photo`, `nao`; FIRE comes next), stored as `agents.onboarding_step` (migration `000051`);
  once started they stay in it even though watching raises their NAO %. Welcome (the old
  leuteriorealty.com/welcome copy beside its NATCON 2025 / 2024 / 2023 slideshow, with the Rent.ph / Leuterio Realty / Filipino Homes
  white logos fading in turn over a `--lr-photo-scrim`; no founder; `resources/assets/onboarding/*`; still under reduced motion) → Get Started → `/welcome/photo`
  (`ProfilePhotoCard`, so the photo is cropped; Continue = `POST /welcome/photo`, needs `agents.avatar`) → **`/welcome/nao`**
  (`Pages/Portal/Onboarding/Nao`, `NaoService`, prop `nao`): attended a face-to-face NAO? **Yes** → proof (photo / selfie /
  screenshot, `UploadPOTForm`, stored by `SaleFileStorage` under `nao-proofs/`) + date (`POST …/nao/attendance`,
  `StoreNaoAttendanceRequest`) → `agent_attributes.nao_attendance_status = yes` (the legacy value: a proof was sent) +
  `nao_attendance_submitted_at`, step done, and the page shows the sponsor (`referral_id`) with mobile + email to ask for approval.
  **Status values are legacy's — never add new ones**: `yes` = proof sent (waiting until `nao_attendance_reviewed_at` is set,
  then approved, which sets `nao_video_tracker` 100 so statistics read it as finished), `disapproved`; the webinar leaves it
  **NULL** and only moves the %. The page's view comes from `NaoService::state()['stage']` (choose / awaiting / disapproved / webinar /
  done; "chose the webinar" = `nao_video_saved_at` set).
  **NAO Approvals** (`/nao-approvals`, every role, `routes/nao-approvals.php`, `Portal\NaoApprovalController`,
  `NaoApprovalService`, page `Portal/NaoApprovals/Index`): every `yes` / `disapproved` row — sent from onboarding or imported
  from legacy (no `nao_attendance_submitted_at`), newest NAO date first. Filters (in the URL): status tabs, search, `team_id`,
  `sub_team_id` (labelled by unit manager) — choices from the agents in reach (`groupOptions`, cached) — and `person` (an agent,
  or everyone they sponsored; typeahead = optional prop `personOptions` via a partial reload with `?person_q=`, within reach;
  `components/utils/tables/FilterAutocomplete` = FilterSelect's searchable sibling). Reach from the data (`reach`): back office nationwide; anyone else = their recruits + current members of the
  teams / sub-teams they lead + an office secretary's branch areas, never their own; nobody → 403. Waiting / approved /
  disapproved = `yes` below 100% and unreviewed / `yes` reviewed or at 100% (how legacy recorded approval) / `disapproved`
  (`STATUS_SQL`). Approve (confirm) → reviewed +
  `nao_video_tracker` 100; disapprove needs a reason (`nao_attendance_remarks`, shown to the agent) and puts them back on the NAO
  step; `nao_attendance_reviewed_by/_at` (migration `000053`, `ReviewNaoAttendanceRequest` checks the reach). Shared
  `auth.nao_approvals = {pending}` (null = nobody) → menu pseudo-grant `_nao_approver` + the item's badge. **No** (`POST …/nao/webinar`, status stays NULL) → the New Agents Webinar (`config/nao.php`: YouTube id + its
  length in seconds, which decides the % server-side) in `components/onboarding/WebinarPlayer` — YouTube IFrame API, no YouTube
  controls, our play / back 10 s / mute / full screen; a jump past the furthest point watched is sent back. Progress
  (`nao_video_seconds` = furthest point, resumes there; `nao_video_tracker` = %) saves every 30 s, on pause / end, by "Save
  progress", and on leaving (a `keepalive` fetch → 204 — the one non-Inertia write here) via `PUT …/nao/progress`; a save may move
  at most the time since the last one (≤ 2 min) + 20 s ahead (`nao_video_saved_at`, migration `000052`); 100% finishes the step.
  That route is in `data_cache.ignore_paths` and `activity_log.except_paths` (it fires every 30 s). "Skip for now"
  (`POST /welcome/skip`) stops the redirect for the session; never while impersonating.
- **Profile / avatars**: `/profile` is shared by every role (`routes/profile.php`, required inside the
  `auth` group; `Portal\ProfileController`). A user's agent record is created on first use by
  `ProfileService::agentFor()`. Photos are **cropped in the browser first** (`components/utils/user/PhotoCropper`: square, round guide, drag / scroll /
  pinch / slider / arrow keys, 1024px JPEG; used by `ProfilePhotoCard` everywhere), then made 512px WebP by `ProfilePhotoService` and the full
  URL is stored in `agents.avatar` (shared as `auth.avatar`). Render people with
  `components/utils/user/UserAvatar.tsx` (photo, falling back to initials). Titled panels: `components/cards/SectionCard.tsx`.
- **Feedback (every page, nothing to add per form)**: `components/utils/feedback/AppFeedback.tsx`, mounted once in `app.tsx`, listens
  to Inertia's router events: a small **"Saving… / Uploading n%" modal** for every non-GET visit (after 350 ms, so quick saves
  don't flash it; not for background writes with `only: [...]` or `async`), and **toasts** (one at a time): the server's flash
  — `->with('success' | 'warning' | 'error', '…')`, shared as `flash` — validation errors ("Please check the form: …"), a write
  landing on the Error page, network / server failures. Client-side ones: `toast.success / error / warning / info` from
  `helpers/toast.ts`. There's no inline flash banner any more — don't add one.
- **Business profile & contact page** (public, `routes/contact.php` required **outside** the `auth` group; `Portal\ContactController`;
  pages outside `AppLayout` that scroll themselves like the auth pages, with the reduced navbar `components/layouts/PublicHeader.tsx`
  — logo, Dashboard / Sign out for a signed-in user, Sign in otherwise). **Business profile** `/business-profile/{slug}`
  (`Pages/BusinessProfile/Show.tsx`, `ContactLinkService::profile`): a social-media-style profile — cover, avatar, name, title,
  area, year joined, About me (`agent_profiles.about`, text), contact details, social buttons (`agent_profiles.facebook`
  cleaned by `SocialLinks::facebook`, `instagram` / `twitter` / `linkedin` by `ContactLinkService::link`, `whatsapp` → `wa.me`
  with `whatsapp()`; edited on its own page `/profile/business` — `ProfileController::business/updateBusiness`,
  `UpdateBusinessProfileRequest`, `ProfileService::updateBusiness` (logged `profile.business_updated`), `Pages/Profile/Business.tsx` +
  `forms/BusinessProfileForm.tsx` (About me, mobile, Facebook/Instagram/X/LinkedIn links, WhatsApp) — the same fields also stay in the main `/profile` form (`ProfileDetailsForm` › Business profile group); both write the same columns, so they are always in sync), Save contact + Send inquiry.
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
  The public name is first + last only (`ContactLinkService::displayName`; the middle name stays in the vCard `N` field). The business profile follows the Leuterio mock: blue `--lr-primary*` accent, two columns from `md` (avatar with red ring + name + verified mark + chips "Leuterio Realty & Brokerage" / province (`profile()['province']` = title-cased `agents.state`) / "Filipino Homes", About Me, Contact me / Save card / Share; right: QR + "Connect with me" badges panel, Contact Information cards that open tel: / mailto: / wa.me / Google Maps), stacked on phones. Social badges use the scheme-independent `--lr-brand-*` tokens in app.css (official brand colours, white mark); the Twitter field is shown as X. QR codes: `components/utils/DotsQrCode.tsx` (round dots + rounded eyes, module grid from the `qrcode` package). Share opens `ShareCardDialog` (QR + share-to links for Facebook / LinkedIn / X / WhatsApp + copy link).
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
- **Sales cutoff & recording switch** (Settings › Sales cutoff, superadmin only; `SalesCutoffController`,
  `SalesEncodingService`, `SalesCutoffPolicy`): monthly `sales_cutoffs` (month `YYYY-MM` → `cutoff_at`) and an
  on/off switch in `app_settings` (`sales_encoding`). Enforced for **every role** in `SaleRequest::after()`:
  recording off → `sales_encoding` error; a reservation month is closed from its own cutoff, or — if it has
  none — once any later month's cutoff has passed (`closedBy`, mirrored in `helpers/salesCutoff.ts` for the
  form warning). Record pages receive `encoding` + `cutoffs`; `SalesEncodingNotice` shows the switch state.
  App timezone is **Asia/Manila** (`APP_TIMEZONE`): cutoffs and legacy dates are Philippine local time.
- **International sales** (global partners): `international_sales` + 1:1 `international_sale_clients`
  (separate from `agent_transactions`), recorded at `/dashboard/record-sale/international`
  (`StoreInternationalSaleRequest` extends `SaleRequest`, so cutoffs/switch apply; `InternationalSaleService`;
  `InternationalSalePolicy` → `record_international_sales`, granted to role `global_partner`). Menu
  `permission` may be a list of alternatives (`helpers/permissions.ts`). **Every shared statistic is local only**
  (sales report, overview, Reports, leaderboards, `/superadmin/statistics`, Recruits, Recruits Progress): international
  sales and global-partner agents are excluded (`Agent::withoutGlobalPartners`, `agent_type = local`) — global partners
  will get statistics of their own (they take no NAO / FIRE).
  Legacy: `legacy:import-international-sales`, see `docs/legacy-migration/international-sales.md`.
- **Dashboard › My Sales** (`/dashboard/my-sales`, `DashboardController::mySales`, tab for anyone with an agent record —
  pseudo-grant `_agent` from `auth.agent_id`): the agent's own sales one by one (`ReportSaleList` with a Type column, no Agent
  column; `lockedFilters` with `['agent_id' => own]`, so the URL can't point it elsewhere), click → read-only details, then
  `ReportStatistics`. Above the list, `SalesTotals`: total + project / brokerage / rental (`totals` prop,
  `SalesReportService::categoryTotals` — every category whatever is picked; a tile picks its category). People search rows show a **sales counter** (`details.sales`: valid + pending, international too).
- **Dashboard › Overview = sales at a glance** (`DashboardController::overview`, same reach as reports: back office the
  whole system with top teams; team leader their team with top sub-teams; unit manager their sub-team; others 403): date
  range, top 5 agents / groups, then `ReportStatistics`.
- **Recruits Progress** (Reports › Recruits Progress `/reports/recruits-progress`; `RecruitProgressService`): recruits
  (signed up in range) vs recruits who sold (any recorded sale), their total valid sales (any date), NAO / FIRE of those
  still in training; grouped by team, sub-team / unit manager, or sponsor (`agent_attributes.referral_id`); top areas +
  sign-ups over time. Same reach as Recruits; leaders lose the groupings that would only show themselves, and a sponsor scope (an agent's own
  recruits, or a clicked sponsor) groups by team / unit manager / location.
  **Recruits tab** (`group=recruits`, `RecruitProgressService::recruitRows`): the recruits themselves — sponsor, team / sub-team,
  signed up, sales, NAO %, FIRE x of 3 — first tab inside a sub-team or one person's recruits, last elsewhere; a row drills
  into that person. Sort keys follow each tab's column fields (`filters()`), or the grid resets the sort and reloads.
  KPIs are `RecruitsPanel` (ordinary stat tiles + FIRE / NAO / Overall cards: not started · on progress · finished,
  for recruits without a sale — the legacy numbers, in this app's style). Groupings: team, unit manager, location
  (area), sponsor. Rows drill down by `team_id` / `sub_team_id` / `area` / `sponsor_id` (merged with the reader's
  reach, which wins) and show the large `ReportScopeHeader`; "View these recruits" opens Reports › Recruits with the
  same selection. The summary is
  one area × month pass, summed in PHP (each pass over ~20k recruits is ~0.5s).
- **Recruits** (Reports › Recruits `/reports/recruits`, and My Team › Recruits; `RecruitmentService`): members by status (now),
  new recruits signed up in the date range (`agents.created_at`), and onboarding of recruits **without any sale** (local or
  international): NAO = `agent_attributes.nao_video_tracker` % (100 = finished), FIRE = `fire_certificates` with 3 = 100%
  (capped). Cards first, then the server-paged trainees table (filter NAO / FIRE level / status). **Clicking a person opens their recruits**
  (`?person=ID`, `ReportsController::personSelection`; date range kept, a profile button stays in the row): a team leader → their
  team, a unit manager → their sub-team, anyone else → the agents they sponsored — also Recruits Progress' sponsor rows. A leader
  stays inside their own group (someone leading another one → just their sponsored agents there); an agent reader goes person by
  person down their own downline (`GenealogyService::canView`), never sideways. Reach: back office all;
  leaders their team / sub-team; anyone else with reports the recruits they sponsored (`sponsor_id` lock,
  `ReportsController::recruitLock`) (menu pseudo-grants `_backoffice` / `_leader`). Portable SQL only (CASE, not
  LEAST — tests run on SQLite).
- **Dashboard (shared)**: `/dashboard/{main,overview,view-sales,record-sale/...}` (`routes/dashboard.php`,
  `Portal\DashboardController`, pages in `Pages/Portal/Dashboard/`) is the **same for every role** and is
  everyone's home (`User::homeUrl()` → `dashboard.index`; old `/superadmin/dashboard/*`, `/admin/dashboard`,
  `/staff/dashboard` redirect there). Menus reuse one `dashboardRoute` node in `app-data.tsx`; roles
  without a portal (agent, team leader, unit manager…) get `memberRoutes`. **Record Your Sale** is the only
  gated part: `record_sales` permission (`AgentTransactionPolicy::create`; granted to agent, team_leader,
  unit_manager; superadmin always) — hide UI with `auth.permissions`. Its only entry point is the sidebar button
  (`SidebarProfile`); the dashboard node carries `tab: false`, so it's in breadcrumbs / search but not the tab bar. Field roles' sales are credited to
  their own agent (`SaleRecord::creditedAgent`); back-office recorders stay `recorded_by` only.
- **Portals & gates**: each role with a portal (`User::PORTALS` = superadmin, admin, staff) has its own
  prefix + `role:` group in `routes/web.php`; everyone else lives on `/profile`. Sign-in and `/home`
  go to `User::homeUrl()` (the shared dashboard); a remembered page is only honoured inside the shared pages or the user's own
  portal. **Every permission name is a gate** (`AppServiceProvider` `Gate::before`): guard routes with
  `->middleware('can:view_reports')`, and add the same `permission` key to the menu item in
  `app-data.tsx` (`adminRoutes`/`staffRoutes`) so it's hidden too. Superadmin passes every gate.
  Menus, breadcrumbs and search all come from `hooks/usePortalRoutes.ts` — **every new page gets a node there** (the
  sidebar shows only top-level items; `children` exist for breadcrumbs + search: Reports cards, Management tabs, My Team
  tabs). Pages reached only from inside other pages (`/agents/{agent}`, `/profile`) go in `pagesOutsideMenu` (`:param`
  patterns). Menu pseudo-grants: `_backoffice`, `_leader`, `_team_leader` (`helpers/permissions.ts`); shared pages for several
  portals live in `Pages/Portal/` with controllers in `Portal\` (e.g. `DashboardController`,
  `StatisticsController`). `auth.portal`, `auth.home`, `auth.permissions` are shared to the UI.
- **Roles & permissions**: managed at Settings → Roles & permissions
  (`Portal\SuperAdmin\Settings\{Role,Permission}Controller`, logic in `RolePermissionService`).
  A role's `name` is a slug derived once from its label and never changes (routes check it, e.g.
  `role:superadmin`); `Role::SYSTEM_ROLES` can't be deleted, `superadmin` always holds every
  permission, and roles with users can't be deleted. Permissions are managed here but **not yet
  enforced** anywhere — only role middleware guards routes. `ConfirmDialog` is the shared
  destructive-action dialog. **One role per user**: assigning (`RolePermissionService::assignRole`,
  Members panel on the Roles page) replaces the user's role; you can't change your own role or move
  the last superadmin. Sign-in sends everyone to the shared dashboard, or to a remembered page under
  `/dashboard`, `/profile` or their own portal (`AuthUserService::redirect`).
- **Agent activity** (`agents.activity`, `Agent::ACTIVITIES` active / dormant — **not** the account status, never blocks
  sign-in): dormant when activated (`agents.activated_at` = legacy `dateactivated`, else `created_at`) over 6 months ago
  and no valid/pending sale (any category, international too) reserved in the last 6 months; rolling, so a sale wakes them
  up. Roles in `Agent::ACTIVITY_EXEMPT_ROLES` are always active. `AgentActivityService::refresh()` runs daily
  (`agents:refresh-activity`, scheduled 01:00), after each recorded sale for that agent, and after `legacy:import-members`.
  **Shown as status, not separately:** everywhere a status is displayed, filtered or counted, an active account whose agent
  is dormant reads `inactive` (`Agent::displayStatus` / `Agent::statusSql()`): Management, Recruits, My Team, profile,
  search, Roles members, Statistics. `users.status` stays `active`, so they can still sign in and record the sale that
  reactivates them; Management rows also carry `account_status` + `activity`. Setting such an agent **Active**
  (`UserAccountService::changeStatus`) restarts `activated_at` (logged `user.reactivated`).
- **User status**: `users.status` is one of `User::STATUSES` (active, inactive, resigned, terminated),
  but **statistics** only split active / inactive (`User::statisticCounts`: resigned and terminated count as inactive —
  Recruits cards, Statistics team); tables, filters and search keep all four.
  changed only through `UserAccountService::changeStatus` (not mass-assignable). Only `active` users
  can sign in; the `active` middleware on the `auth` route group signs out anyone deactivated
  mid-session. New signed-in routes must stay inside that group.
- **Activity log**: every POST/PUT/PATCH/DELETE is written to `activity_logs` automatically by
  `Http/Middleware/LogActivity.php` (after the response; passwords/tokens redacted, files logged as
  name/size only). For a readable entry, inject `App\Services\ActivityLogger` into the service and
  call `describe('domain.verb', 'Human sentence', $subjectModel, [...extra])` once the action succeeds
  (see `ProjectSaleService::record`). Add new sensitive field names to `config/activity_log.php` `redact`.
- **Tables**: MUI X DataGrid (`@mui/x-data-grid`, free) via `components/utils/tables/DataTable.tsx`
  (token-themed, `autoHeight` so `<main>` stays the only scroller) + `TableToolbar` / `FilterSelect` /
  `PersonCell`. Small sets (< ~1k rows) are sent whole and filtered in the browser (Management Teams);
  large ones are **server-paged** with `hooks/useServerTable.ts` (page/sort/search/filters in the URL
  query, partial reload of one prop; the controller returns `{data,total,page,per_page}` and accepts
  sort keys equal to the column `field`s — see `TeamDirectoryService`). PHP sends empty filters as `[]` (the hook treats an array as none —
  `[].sort` is a function). Controlled grid models (`sortModel`, `paginationModel`) must be
  memoised: DataGrid re-applies them on every new reference and treats a new sort model as a sort, resetting to page 1. Status cells: `StatusChip` /
  `StatusMenu` (PATCH `{status}`, confirm for destructive ones); photo cells: `PhotoUploadButton`.
- **Management** (`/{superadmin,admin,staff}/management`, same pages in
  `Pages/Portal/Management/`, routes from `routes/management.php` called per portal, guarded by
  `can:manage,Team` = `TeamPolicy::manage` → **any of the five Management permissions**, so ticking one for a role opens it).
  **`/management` is a card page** (`Pages/Portal/Management/Index`, `can:open,Team` = Management permissions **or** a receiving
  permission; `TeamDirectoryService::overview` counts): one card per section from `components/management/managementCatalog.ts`
  (also the `ManagementLayout` tabs — Overview first — and the menu node's children): Agents, Teams, Sub-teams, Team transfers,
  **Brokerage receiving, Rental receiving** (their pages keep their URLs and permissions but render inside `ManagementLayout`;
  they're no longer sidebar items — the Management item carries their awaiting badge). Agents ( by default only agents **on a team** and **fully registered**: filters `membership=no_team|any`,
  `registration=incomplete|any`, shown with `FilterSelect hideAll`; clicking a name opens `AgentDetailDrawer` — the search's `PersonDetails`, from optional prop
  `agentDetail` (`?agent=ID`, `PersonDetailsService`, shared with `/search/users`) + "View profile"), Teams (`/management/teams`),
  Sub-teams, Team transfers. Menu: Management sits right under Dashboard. **Each kind of change is its own permission**
  (`Permission::MANAGEMENT`, section "Management", migration `000040` gave all five to superadmin + admin): `edit_designation`
  (also the agent's type), `transfer_agents`, `change_agent_status` (also the agent's photo), `edit_teams` (create / edit / logo of
  teams and sub-teams), `change_team_status` —
  checked in each Form Request via `ManagementRequest::allows()`, on top of `can:manage,Team`; the pages hide or disable the
  control with `hooks/useCan.ts`.
  Logic in `TeamManagementService` (writes) / `TeamDirectoryService` (reads). Team & sub-team statuses
  are `Team::STATUSES` (active, inactive = paused, deactivated = closed: ends every active stint today
  and deactivates its sub-teams). A **transfer** never edits history: it closes the current
  `team_agents` / `sub_team_agents` row (`inactive`, `transferred_at` = date) and opens a new active one —
  one active stint per agent per table. Team photos go through `ProfilePhotoService::uploadSquare`
  (`team-logos/`). Agent status/photo: admins may change agents and staff but not admins/superadmins
  (`UserPolicy::updateStatus/updatePhoto`); anyone else given Management (e.g. staff) only field roles, not the back office. **Designation** (Agents table → `forms/DesignationDialog.tsx`, radio buttons + dates;
  `PUT …/agents/{agent}/designation`, `UpdateDesignationRequest`, same reach; `AgentDesignationService`, logged
  `agent.designation_changed`): **Unit Manager by rate** = designation only, they keep their role and dashboard; **by dashboard** =
  the Unit Manager role (via `RolePermissionService::assignRole`, only from agent / global partner; leaving it goes back to Agent);
  `agents.unit_manager_by` (`Agent::UM_BASES`) + `unit_manager_since`, and **Broker** `is_broker` + `broker_since` (dates required,
  not in the future). Filter `designation=um_dashboard|um_rate|broker`. Every place that shows a person sends
  `Agent::designationsOf()` and renders `components/utils/user/DesignationBadges.tsx` beside the role (UM by rate, Broker; dates in
  the tooltip, printed on the profile) — search rows, profile, agent sales, genealogy cards, the agents table.
- **Editing an agent's profile & upline** (agent profile page `/agents/{agent}`; permission `edit_agent_profile`, section
  Management, migration `000047` → superadmin + admin; `UserPolicy::updateProfile`: only a superadmin edits superadmins' /
  admins' own): "Edit profile" = the "my profile" form (`forms/ProfileDetailsForm` with `action`) in
  `components/agents/EditAgentProfileDialog`, `PUT /agents/{agent}` (`UpdateAgentProfileRequest`, `ProfileService::updateAgent`;
  the user's name / email follow). "Change upline" (`ChangeUplineDialog`, `PUT /agents/{agent}/upline`, `ChangeUplineRequest`,
  `AgentUplineService`): sets `agent_attributes.referral_id` and **moves the agent to the upline's team and sub-team** via
  `TeamManagementService::transfer` from the chosen date (history kept) — the upline's active stint, else the team / sub-team
  they lead; **team only** when the upline has no sub-team there; nothing moves when the upline is on no team (warning).
  Refuses the agent themself or anyone in their downline. Preview: optional prop `uplinePlacement` (`?upline_preview=ID`).
  `team_agents` / `sub_team_agents.transferred_at` is the **end** of a stint — reports credit a sale to the team whose stint
  covers its reservation date (`joined_at` ≤ date < `transferred_at`), so it is not redundant with `joined_at` + `status`.
- **Documentation** (`/{superadmin,admin,staff}/documentation`, routes from `routes/documentation.php` called per portal,
  `can:manage,AgentDocument` = permission `manage_documents`; `Portal\DocumentationController`, `AgentDocumentService`):
  agents' requirement documents in `agent_documents` (type `AgentDocument::TYPES`, status `AgentDocument::STATUSES`,
  `is_current` = the latest of its type per agent — keep exactly one) + reviewers' `agent_document_comments`. Server-paged
  table (latest only by default), status tabs from the `counts` prop, review drawer opened by `?document=` (partial reload of
  `document`). Sending back (`for_reupload`) requires remarks. Legacy: `legacy:import-documents`, see
  `docs/legacy-migration/documents.md`.
- **Sales validation** (`/{superadmin,admin,staff}/sales-validation`, routes from `routes/sales-validation.php` per portal,
  `can:sales_validation`; `SalesValidationController`, `SaleValidationService`): everything is within a reservation-date
  range (`from`/`to`, default this month — first day to today; joined from the three category tables). Pick an area (the credited agent's
  `agents.area`, else the recorder's; plus All areas — Abroad and no-area aren't offered) → a category (project / brokerage / rental, counts as status-coloured `StatusChip`s: amber pending, green valid, red
  invalid, grey cancelled) — or **All sales** (`category=all`, `SaleValidationService::ALL_CATEGORIES`: the three tables as one
  `UNION ALL` (`allCategories`, date-limited per branch), `counts.all`, a Type column and each row's own property / files by `sale_type`)
  → a server-paged table per status (pending, valid, invalid, cancelled) with client, agent, project + developer /
  brokerage area / closing agent, unit, price, reserved, date added and the files (POT; remittance + deposit slips).
  **Every status change is confirmed first** (`components/sales/saleStatusConfirm.ts`: what each status does; `StatusMenu` `confirm`
  + `safe` for the primary-toned ones; `SaleDetailsForm` asks when its status changed; the slip panel's "Sign & receive" asks too).
  Status via `StatusMenu` → `ValidateSaleRequest`; `setStatus` stores `validated_by` / `validated_at`, appends to
  `update_logs`, logs `sale.validate` and refreshes the agent's activity.
  Menu **badge** = pending sales the user can validate **this month** — the range the page opens on, so it equals the "All
  areas" card (back office) or the secretary's area card (`SaleValidationService::pendingCount`, `auth.sales_validation`).
  Clicking an agent opens `AgentSalesPanel` (`?agent=ID`, partial reload of `agentSales`, `agent_dates=all` for every date):
  their sales client first in Project / Brokerage / Rental tabs (newest 100 each), with status chips and `StatusMenu`.
  Clicking a sale (table row → right drawer; agent panel card → expands in place) loads `saleDetail` (`?sale=ID`,
  `SaleValidationService::detail`: agent, client, property, payment, files, history) into `components/sales/SaleReview.tsx`:
  a colour-coded **status banner** (icon + label + who / when) with **validation buttons** (Validate / Mark invalid / Cancel sale /
  Back to pending, each confirmed, `PATCH`), then the details **read-only** (`SaleDetailsView`) until "Edit details" opens
  `SaleDetailsForm` — which **never sets the status** (validating and editing are separate): `PUT …/sales-validation/{sale}` (`UpdateValidatedSaleRequest`, keys = column names, `status` optional and only applied if sent, fields by
  category, measurements optional but cleared when the property type doesn't use them) → `SaleValidationService::update`
  (`EDITABLE` map) writes one `update_logs` line listing every change, logs `sale.edit`, recomputes `client_age` from a new
  birthdate. Pickers: `editOptions` prop. Controls inside a row stop the click (`stop`).
- **Global Partners** (`/global-partners` + `/global-partners/statistics`, shared by every role; `GlobalPartnerController`,
  `GlobalPartnerService`): a partner counts here only if `agent_type = global_partner`, based outside the Philippines
  (`country_code` set and not PH), fully registered (status 4) and signed up from 2024-02-01 — one query (`partners()`) drives
  list, counts, badge, statistics, sales and who can be confirmed. Reach (`GlobalPartnerService::reach`) = every partner
  for the back office; else `{sponsor, teams, sub_teams}`: their own recruits (`agent_attributes.referral_id`) plus every partner
  currently on the teams / sub-teams they lead (leadership from the data) — a team leader sees the whole team's, a unit
  manager their sub-team's, an agent just their recruits; 403 when that's nobody. Anyone may confirm within their reach.
  Statistics also rank **Top teams** and **Top recruiters** (the latter only when the reach covers others), and a click on a
  team / recruiter / partner country narrows the whole page (`team_id` / `sponsor_id` / `country`, `stats.selection` header;
  `BarList` items take `href`). Confirmation = `agents.sponsor_confirmed_at` / `_by` (legacy
  `members.sponsor_activation_status = 'confirmed'`, `legacy:import-partner-confirmations`); the partner's sponsor or the back
  office confirms (`ConfirmGlobalPartnerRequest`, logged `partner.confirmed`). Shared `auth.global_partners = {pending}` (null =
  no reach) drives the menu pseudo-grant `_partners` and the sidebar **badge** (`PortalRoute.badge`, set in `usePortalRoutes`).
  Statistics need `view_global_partner_statistics` (route, menu child, `GlobalPartnersNav` tab; migration `000031` granted it to
  superadmin, admin, staff, agent, unit_manager, team_leader) and stay within the reach (a sponsor: their recruits).
  Statistics are **international sales only** (valid + pending; legacy imported them all pending): partners by country with
  flags (`FlagIcon`, `BarList` `leading`), sales by client country, trend, top partners (everyone who sold); long lists are
  `PagedBarList` (10 per page, one bar scale across pages, a name search box once a list has more than one page —
  `searchLabel`). Sponsors may open their partners' profiles.
- **Genealogy** (`/genealogy`, `routes/genealogy.php`, `Portal\GenealogyController`, `GenealogyService`; permission
  `view_genealogy`, migration `000037` gave it to every role; menu `genealogyRoute`): the recruit tree — sponsor =
  `agent_attributes.referral_id` — as fixed-size cards (`components/genealogy/GenealogyCard`, `CARD_W`/`CARD_H`) on a pan-and-zoom canvas
  (`GenealogyTree`: top-down layout computed in the component, SVG connectors, drag / wheel / pinch / buttons, fit, fold all;
  any card opens at any depth), fully registered agents
  only (the top card shows whatever its step). Everyone opens their own tree and any card below them (`?agent=ID`); back office
  picks anyone, an office secretary agents of their areas and everyone below them (`canView` walks up the sponsor chain).
  The picker is `AgentPicker` with `searchUrl="/genealogy/search"` (+ `role` = team_leader / unit_manager / agent). Branches
  load as cards open, biggest downline first, `limit` at a time after the ones shown: optional prop `branch`
  (`?parent=&offset=&limit=`, `router.reload` with `preserveUrl` + `async`). "Recruits per card" (`User::GENEALOGY_SIZES`, default
  5) and the layout (`User::GENEALOGY_LAYOUTS`: vertical = levels as rows, horizontal = levels as columns) are Preferences
  (`genealogy_per_branch`, `genealogy_layout`), also switchable on the canvas (`PUT /settings/preferences/genealogy`,
  `UpdateGenealogyPreferenceRequest`, either field); a smaller number trims what's open to the best few. "Sponsored by" shows the chain above, only as far up as the reader may see. Legacy has
  self-sponsored agents (and maybe loops): the service excludes them and the tree never repeats a card in its own path.
- **Office secretaries** (`offices`, legacy `legacy:import-offices`, `docs/legacy-migration/offices.md`): each office has an
  area and an assigned secretary (`secretary_agent_id`). `OfficeService::areasFor($user)` is that secretary's reach —
  from the data, not the role. It drives: **Sales validation** at the shared `/sales-validation` (`routes/sales-validation.php`
  called without a portal; `SaleValidationService::allowedAreas` → only those areas, one area opens directly, requests
  refuse other areas' sales); **reports** (`TeamLeadershipService::reportScope` → `['area' => …]`: agents and unit managers
  of the area, teams/sub-teams counted only by their members there — a Cebu team with Davao members shows on Davao's list;
  the Areas views are hidden); **Recruits / Recruits Progress** (area lock; every count is that area's, named by the area header and
  `recruitment/AreaOnlyNote` + "· {area}" on the cards — also when the back office clicks an area); **agent profiles** of their area; Overview
  ranks the area's teams. Shared as `auth.office_areas`; menu pseudo-grant `_secretary` (member menu item needs it +
  `sales_validation`).
- **Sign in as a user** (superadmin only; Management › Agents row action, agent profile button): `POST /impersonate/{user}`,
  `DELETE /impersonate` (safe to repeat: with nothing to stop it just goes home; a stray `GET /impersonate` too), `ImpersonationService` (session key `impersonator_id`; each switch moves to a new session id and **retires the old one** —
  every response re-sends the session cookie, so a slow background request still on the old session would put it back and
  undo the switch; `DropRetiredSessionCookie` (outermost web middleware) drops such a response's cookie and the row it re-saved, and answers a
  GET with a redirect to itself so the page is rebuilt for the current session; `AppFeedback` flushes prefetched pages after every
  finished write (per visit) and whenever `auth.id` / `auth.impersonator` changes). Never on superadmins or inactive users; `ImpersonationBanner` in `AppLayout`;
  activity logs get `impersonated_by`. Shared: `auth.impersonator`, `auth.can.impersonate`.
- **My Team** (`/my-team`, `MyTeamController`, `TeamLeadershipService`): for whoever leads a team (`teams.agent_id`) or
  sub-team (`sub_teams.agent_id`) — leadership comes from the data, not the role; shared as `auth.leads` (drives the
  menu item + switcher). Overview = the report locked to their group (opens on last month); Members (server-paged —
  teams reach 12k members); Sub-teams. **My Team is view-only for every leader**: adding members, moving them between
  sub-teams and creating / editing sub-teams are Management's (superadmin / admin) — the old My Team write routes were removed. The Sub-teams page shows, for a date range (default last month), each sub-team's sales and its unit
  manager's own sales, ranked either way (`SalesReportService::totals`). A team leader can open any sub-team of their team (`?sub_team=`, read-only, `group.parent` set).
  Menus treat leaders as holding the pseudo-permission `_leader` (`helpers/permissions.ts`). Leaders
  can open their active members' `/agents/{agent}` profiles.
- **View as role** (superadmin testing): profile menu → "View the portal as …" (`POST/DELETE /view-as`,
  `ViewAsService`, encrypted cookie `lr_view_as` — **not** the session: the database session is rewritten whole by
  every request, so a slow background request would end the preview). `ApplyViewAsRole` middleware (before
  `HandleInertiaRequests`) calls `User::viewAs($role)`, after which `hasRole`, `hasAnyRole`, `portal`,
  `permissions` and every gate/policy act as that role; `User::reallyHasRole()` ignores the preview (only
  for starting/stopping it). Shared: `auth.viewing_as`, `auth.view_as_roles`, `auth.can.view_as`;
  `ViewAsBanner` (in `AppLayout`) offers the way back. Never check roles another way than these methods.
- **Never hardcode a person**: greet with `auth.first_name`, build personal links from the signed-in
  user (`helpers/userLinks.ts`). "Online now" is real presence from the database session store
  (`OnlineUsersService`, shared as `online_users` to back-office roles only), shown by
  `SideRail` via `OnlineUsersPanel` — pinned in the right rail on desktop, a face strip on
  smaller dashboard screens. **Realtime**: Laravel Reverb (WebSockets, `php artisan reverb:start`, started by
  `composer dev`) + a presence channel `portal.online` (`routes/channels.php`; every active user joins,
  members see id/name/avatar/role). The client joins once per tab in `helpers/presence.ts` (outside
  React, so page visits don't rejoin) and authorizes with the fresh `XSRF-TOKEN` cookie. If the socket
  is down, `hooks/useOnlineUsers.ts` falls back to the 60s partial-reload poll.
- **Sales report** (Dashboard › View Sales, `/dashboard/view-sales`, and every `/reports/*` page). **Reach is by who you
  are, not just `view_reports`** (`TeamLeadershipService::reportScope`): back office (superadmin/admin/staff) with
  view_reports → whole system; a team leader / unit manager → their own team / sub-team; anyone else with view_reports →
  their own sales; otherwise 403. Applied with `SalesReportService::lockedFilters` (scope keys in the URL are dropped),
  shown as `scopeLocked` + the scope header; `viewsFor($lock)` drops views that would only show the reader's own group
  (no Teams / Top Teams when locked to a team; also no Sub-teams for a unit manager / agent), and the Team column is
  hidden inside a team or sub-team scope; `SalesReportController` →
  `SalesReportService`): one UNION of the three local categories (project, rental, brokerage; local agents only; date +
  status filtered inside each branch, uses the `reservation_date` / `sale_status` indexes) feeds KPIs (vs the
  same-length previous period), a monthly trend (yearly past 36 months) and a server-paged breakdown by view:
  agents, teams / sub-teams (team at the reservation date, same rule as Top Teams), developers (project),
  brokerage (agents, brokerage only), rental (agents, rental only). Filters live in the URL; the page reloads
  `breakdown` + `summary` via `useServerTable(..., ['summary'])`. Default: this year, valid sales.
  **Reports** (`/reports`, sidebar item for every portal and field roles, same reach rule; `ReportsController`): cards from
  `components/reports/reportCatalog.ts` → `/reports/{slug}`, each one view of the same service (Top Agents, Top Unit
  Managers = agents with role `unit_manager`, own sales; Top Teams, Top Sub-teams, Developer / Brokerage / Rental
  Sales — brokerage and rental rank agents). Also **Top Team Leaders** (`team_leaders` view: role members' own sales, like `unit_managers` — `ROLE_VIEWS`) and
  **Developers by Area** (`area-developers` = the developers view + an area picker `areaOptions` for unlocked readers; a
  developer opens `/reports/top-agents?area=…&developer_id=…`). Inside a developer the page has **Top agents | Top teams | Top sub-teams | Sales** tabs, inside a branch the first
  three (the team tabs only for the back office and office secretaries — `groupTabs`; `list=teams|sub_teams` switches the view, a
  team clicked there keeps the developer / branch): `list=sales` sends
  `saleList` (`SalesReportService::saleList`, same filters, newest reservation first, read-only, searchable by agent / client / project / unit via `q` — `ReportSaleList`); a row opens the sale **read-only** in a drawer
  (`?sale=ID` → `saleDetail`, only if `SalesReportService::containsSale` — in this report's filters and the reader's reach —
  data from `SaleValidationService::detail`, shown by `SaleDetailsView`: files incl. proof of transaction, client, property,
  payment, history). Both that panel and the Sales validation form show the files first via `components/sales/SaleFiles.tsx`
  (photos inline, PDFs / Word as links).; the sales
  union carries `sale_id` for it. Report filters **combine** (area + developer, a lock +
  developer): `lockedFilters` still drops the lock's kinds of keys from the URL but lets a developer drill-down through.
  **Each report is also its own permission** `report_{slug}` (`ReportsController::permission`,
  migration `000024`; granted to every role that had view_reports) — checked on the page and in `available()`, and as
  `requires` on the menu children (all-of, on top of `permission`'s any-of). Settings › Roles & permissions groups
  permissions by `Permission::SECTIONS` (report_* → Reports); add new permission names to a section there. Both pages render `components/reports/SalesReportView.tsx` (View Sales with view tabs, a report without).
  Drill-down: Teams / Sub-teams / Developers rows open that group's top agents (`team_id` / `sub_team_id` /
  `developer_id` filter → `SalesReportService::sales()` scope; teams by the stint covering each reservation date;
  shared `scope` prop names it for the chip).
- **Areas** (offices) — **shown to users as "Branch"** (columns, filters, headers, "Sales by Branch", "All branches"); code,
  routes and data keep `area` and counting is still by area (an area may hold several branch offices). `config/areas.php` (legacy LOCATIONS_LATEST + `abroad`) → `agents.area` via `App\Support\Areas`
  (state, then city: own area name > listed place > contains name > contains place; non-PH country → abroad).
  The `Agent` model re-derives it when state/city/country_code change; rows written with `DB::table` (imports)
  must set it themselves or run `php artisan agents:assign-areas`. Reports: `areas` view / "Sales by Area" card,
  drill by `area`. Agents with no area count in totals but are **never shown as an "Unassigned" area** in any
  statistic (By area, Sales by Area, Recruits Progress areas); Management › Agents and the profile still say "Unassigned".
- **Report layout**: the ranked table comes first (name, Area / location, Team where relevant, Total sales — no
  count / average / share columns); statistics (`components/reports/ReportStatistics.tsx`: tiles, trend, by
  category, by area, by client country — codes and legacy names merged via `Countries::resolve`, top 10 + Other —
  by client gender, by client age, by property type, and Top developers with % share of project sales when the report includes
  project sales) sit underneath. A drill-down shows `ReportScopeHeader` (photo, name, facts, total, "Show
  everyone") under the title instead of a chip; `scope` carries `avatar` + `facts`. People rows (reports, Overview top agents) open that agent's
  sales `/agents/{agent}/sales` with the same dates / status / category; the read-only profile is `/agents/{agent}`
  (`AgentProfileController`, view_reports or team managers; same service with an `agent_id` scope).
  Every sale of one agent: `/agents/{agent}/sales` (`AgentProfileController::sales`, `Pages/Portal/Agents/Sales.tsx`), the
  same `components/sales/AgentSalesView.tsx` as Dashboard › My Sales; opened from the profile and the search dropdown.
  Profile cards sit in even rows (three-up `lg: 4`, About full width, history pairs), every `SectionCard` with `fill`.
  Date ranges use `components/utils/DateRangeField.tsx` (free `@mui/x-date-pickers` DateCalendar + dayjs, quick
  ranges + click first/last day) — MUI's DateRangePicker is Pro-only, don't add it.
- **Data cache** (`App\Support\DataCache`, `config/data_cache.php`): expensive report / statistics reads are cached by what was
  asked (filters incl. reach, page, today's date) and a **data version** — `StatisticsService::summary`, `SalesReportService`
  (`summary`, `breakdown`, `saleList`, `totals`, `categoryTotals`), `RecruitmentService` / `RecruitProgressService` (`summary`,
  `table`), `GlobalPartnerService` (`counts`, `table`, `statistics`), `LeaderboardService::recentMonths`: each public method wraps a
  private `compute…` (`DataCache::remember`, paginators via `DataCache::page`). **Every write bumps the version**:
  `BumpDataVersion` middleware after any successful non-GET (except `ignore_paths`: sign-in, presence auth, preferences,
  view-as, impersonation, slip previews) and `CommandFinished` for data commands (`legacy:*`, `agents:*`, `rentals:*`,
  migrations). A TTL (10 min) covers changes made outside the app. Wrap any new heavy read the same way; anything that writes
  outside a request or those commands must call `DataCache::bump()`. Off in tests (`APP_ENV=testing`) unless a test sets
  `data_cache.enabled`. The database cache keeps expired rows, so `cache:prune-expired` runs hourly. In the browser, sidebar
  links and dashboard tabs prefetch on hover (`cacheFor="1m"`); `AppFeedback` calls `router.flushAll()` after every write.
- **Charts / statistics**: `/{superadmin,admin,staff}/statistics`, guarded by its own `view_statistics` permission (Settings ›
  Roles & permissions › Statistics; migration `000028` gave it to every role that had view_reports) (`StatisticsController` → `StatisticsService`,
  sales dated by `reservation_date`). Client splits (country, gender, age) for both pages come from `App\Support\ClientStats`; ages
  outside 18–99 are typos and only counted as `excluded` (`agent_transaction_details.client_age`: legacy `clientAge` via
  `legacy:import-client-ages`, new sales from the birthdate at the reservation date in `SaleRecord`); UI `ClientAgeChart`. Charts are plain MUI in `components/charts/` (`StatTile`,
  `MonthlyColumnChart`, `BarList`, `ShareBar`) — no chart library. Series colours are the validated
  `--lr-series-1..3` tokens in fixed order (light/dark in `app.css`); text always uses text tokens;
  every chart carries a visually hidden data table (`srOnly`). Money: `helpers/formatNumber.ts`.
- **Leaderboards** (`components/utils/SalesLeaderboards.tsx`, in `SideRail` under "Online now" on every
  route): gated by the `view_leaderboards` permission (grant it per role in Settings). Data is the
  **optional** shared prop `leaderboards` (`LeaderboardService`), computed only when the panel asks via
  `router.reload({ only: ["leaderboards"] })` — use the same pattern for other heavy side panels.
  Optional props are dropped on the next visit, so `hooks/useLeaderboards.ts` keeps the last result
  in a module cache (refetched only when older than 5 min).
  Boards: agents, brokerage (agents by brokerage sales), teams, projects, developers for this and last month.
  Sale counts/amounts are sent only to `LeaderboardService::AMOUNT_ROLES` (superadmin, admin, staff); other roles
  get names in rank order (stripped server-side, never just hidden in the UI). A month = valid sales
  **reserved** in it and **encoded** (`agent_transactions.created_at`) by its cutoff in
  `sales_cutoffs` (imported by `legacy:import-sales-cutoffs`; no row = month still open). Top Teams
  credits a sale to the team its agent was on at the reservation date (`team_agents` history).
- **NATCON** (`/natcon`, permission `view_natcon` — superadmin, admin, staff, team_leader, unit_manager, agent (`000046`, `000048`);
  `Portal\NatconController`, `NatconService`; menu right after Reports): like Reports, `/natcon` is a card per board (with its
  count) and `/natcon/{slug}` the ranking (slugs = `NatconService::BOARDS` = `components/natcon/natconCatalog.ts`, the menu's
  children; `NatconPeriod` header on both) — six boards over one period: Qualifiers (agents whose valid local sales of
  every category reach the qualifier amount), Top Teams, Top Brokerage Sales (agents), Top Rent Managers (agents, rental),
  Top Brokerage Teams, Top Sub-Teams. A sale counts if it's **valid**, reserved in the period and **encoded**
  (`agent_transactions.created_at`) by the cutoff of the cutoff month (`sales_cutoffs`; none yet = everything so far).
  **Top Rent Managers has its own period and cutoff date** (`rental_from` / `rental_to` / `rental_cutoff`, defaults
  2025-09-01 – 2026-08-31, encoded by the end of 2026-09-05 — a date, not a monthly cutoff); `NatconService::period($board)`
  decides per board (board `period => 'rental'`), sent to the pages as `period` / `boards[].period`. Each
  board is a `SalesReportService` breakdown with the filters `encoded_by` + `min_value` (not URL filters, so the drill-down
  pages show the plain period). Period / cutoff month / qualifier amount: Settings › NATCON (superadmin, `app_settings`
  key `natcon`, defaults 2025-08-01 – 2026-07-31, July 2026, ₱43M; plus the rental period / cutoff date).
  **Reach** (`NatconService::reach`): the back office (superadmin / admin / staff) every board of everyone; whoever leads a team /
  sub-team (from the data, `TeamLeadershipService::current` — a team first) **only Qualifiers**, locked to that group
(`team_id` / `sub_team_id`: sales made while on it); anyone else with an agent record only **My NATCON sales**
  (`/natcon/my-sales`, `NatconService::mineFilters`: their own valid sales in the main period, encoded by its cutoff, every
  category — the Qualifiers rule — shown by `AgentSalesView` with `fixedPeriod` + a qualifier progress bar; migration `000048`
  gave `view_natcon` to agent); no agent record → 403. Menu: `[BACKOFFICE, LEADER]` +
  `requires: view_natcon`, non-qualifier children `BACKOFFICE`. Amounts are shown to everyone with reach; rows open sales
  (`canOpen`) for leaders and readers with view_reports.
- **Legacy data**: the old system is restored locally as database `lr_legacy` (connection `legacy`,
  read-only use). Imports are artisan commands backed by services in `app/Services/Legacy/`
  (`legacy:import-members`; legacy SUPERVISOR = `team_leader`, there is no supervisor role; **Broker is not a role** —
  `agents.is_broker`, from legacy `members.membertype = 'broker'` whatever the account's role, `legacy:import-brokers` backfills
  it and retired the old Broker role (its holders → team leader / unit manager by leadership, else agent)): idempotent by email, `--dry-run` rolls back, rejects go to
  `storage/app/private/legacy-import/`. Mapping and decisions: `docs/legacy-migration/`.
  `agents.agent_type` is `Agent::TYPES` (local, global_partner): global = legacy `national_intern` international
  + joined ≥ 2024-02-01 + country not PH (`Agent::typeFromLegacy`, `LegacyAgentOrigin`, `legacy:import-agent-types`
  re-applies it and syncs the `global_partner` role). `agents.lr_joined_at` = joined Leuterio Realty (legacy
  `members.lr_joined`, `legacy:import-lr-joined`; "0000-00-00" = none): the search's "Registered", the profile's "Joined
  Leuterio Realty" and the global-partner cut-off (else `created_at`). `agents.country` / `country_code` via `App\Support\Countries` (no country
  recorded → Philippines / `PH`: `Agent::saving`, `LegacyAgentOrigin`, migration `000027`; agent type is decided first)
  (`config/countries.php` mirrors `countries` in app-data.tsx — change both); show with `CountryFlag`.
  **`agents.id` = legacy `members.id`** (and is the agent's referral number), so later imports
  (teams, sales) join legacy member ids straight onto `agents.id` — never via a lookup table.
  Sales (`legacy:import-sales`): `agent_transactions.id` = `salesreport.id`; category from legacy
  `developers.isbroker` (0 project, 1 brokerage → `brokerage_areas`, 3 rental); `agent_id` from
  `agentid → members.memberid → members.id`. Client name = legacy `clientfamilyname` (full
  name in `client_first_name`; legacy `name` is the *agent*). Rental/brokerage property details live in their own
  tables (see `docs/legacy-migration/sales.md`). Teams (`legacy:import-teams`): `teams.id` /
  `sub_teams.id` = legacy ids; members via `memid`/`memID`/`LeadID` (= `members.id`), never the
  legacy `agentid`; per agent only the newest membership can be `active` (see `teams.md`).
  **Fully registered** = `agent_attributes.registration_status = 4` (legacy registration stepper 1–4, backfilled by
  `legacy:import-registration-status`); member/recruit/headcount statistics count only those —
  use `Agent::fullyRegisteredIds()` / `Agent::FULLY_REGISTERED`. Sales totals are not filtered. Pages that
  list users must page/search server-side — there are ~83k users now.
- **Global search** (navbar, `components/utils/search/GlobalSearch.tsx`): pages come from `app-data`
  routes via `helpers/searchPages.ts` (client-side); people come from `GET /search/users`
  (`Portal\SearchController`; rows show role + status read-only and open `/agents/{agent}` — back-office roles may open
  any profile, sales only with view_reports; superadmins get a "Sign in" button per row, `can_impersonate`; each person also carries `details` (team / sub-team + joined, registered,
  mobile, address, PRC / DHSUD expiry, Facebook link — `App\Support\SocialLinks::facebook` cleans legacy values, also on
  the profile — `AgentActivityService::windows` 6-month window) and `last_active_at` (users column; legacy
  `users.updated_at` via `legacy:import-last-activity` for now, activity logs later), shown by `PersonDetails` on expand; team leaders / unit managers also search, finding only the current members of the groups
  they lead — `TeamLeadershipService::ledMemberIds` — office secretaries the agents of their office's area (`SearchController::reach`, `UserPolicy::search`) — whose profiles they may open with sales), teams / sub-teams / areas from `GET /search/groups` (`GroupSearchService`, same reach as
  reports: back office → any group, opening `/reports/top-agents?team_id|sub_team_id|area=`; leaders → only groups they
  lead, opening My Team; `auth.can.search_groups`) — with `/search/agents`, `/genealogy/search` and `/search/users/{user}/certificates` (FIRE courses from realestatetraining.ph via
  `FireCertificateService`: `user.score`, max 3, course/date/score only, cached 1h, `services.fire_certificates.url`), the
  **only sanctioned JSON endpoints**, because typeahead can't be an
  Inertia visit. Don't add other JSON endpoints without the same reason. Who may do what is shared as
  `auth.can.{access_superadmin, search_users, manage_users}` — use these flags, not role names, in the UI.
- **Navigation**: Inertia `<Link>` / `router` only (`components/AppSidebar.tsx:85`).
  No raw `fetch`/`axios`/`window.location` for page transitions.
- **Controllers**: always suffixed `Controller`, in the `Portal\{Role}` namespace of the
  portal they serve.

## 4b. Unfinished sections

A menu section whose content isn't built renders the shared `Pages/Portal/UnderConstruction.tsx` (`title`, `description`)
from its controller (Accounting, Human Resource, Inbox) — never a placeholder page of its own.

## 5. Do not imitate

- The form pattern that never submits: `useState` + `window.location.href` (`Pages/User/Auth/CreatePassword.tsx:32`).
- Also: per-page
  `'user' => Auth::user()` props (7 controllers), lowercase page filenames.

## 6. Comments

- Explain **why**, not what. One line max.
- No JSDoc/docblocks unless the signature is non-obvious.
- Never leave notes describing your own edit — no "changed X to Y", no `// to do` markers,
  no commented-out code left behind.
