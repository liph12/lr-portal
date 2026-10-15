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
- Card icons: `components/utils/SpotIcon.tsx` (`name`): simple flat drawings on a soft rounded tile, in the brand colours only —
  `--lr-primary` shapes, one `--lr-accent` red detail, pale-blue fills; no gradients, shadows or extra colours. NATCON's cards use `tone="gold"` (gold on near-black, `--lr-natcon-*`). The
  Management / Reports / NATCON catalogs give each card an `art` name; tabs and menus keep the flat MUI `icon`.
  Dashboard › Tools & apps: `DashboardCardApp` takes an image or a `SpotIcon` (`icon`), `external` for files / sites (new tab); the policy
  handbooks (Team Leader, Unit Manager, Salesperson — `HANDBOOKS` in `Dashboard/Index.tsx`, PDFs on leuteriorealty.com) use `handbook-*` drawings; which ones
  show is the prop `handbooks` (`DashboardController::handbooks`: team leader all three, unit manager UM + salesperson, everyone else salesperson; back office all).
- Pages/components: PascalCase `.tsx`, one component per file, **default export**.
  Pages use `Index.tsx`.
- Hooks: `hooks/use{Thing}.ts`, default export (`hooks/useBreadcrumbs.ts`).
  Helpers: `helpers/{camelCase}.ts`, **named** exports (`helpers/routeMatch.ts`).
- Props: inline `interface {X}Props` in the component file; controller props arrive as a typed
  destructured argument — `usePage().props` is not used for page props.
- Imports: deep relative paths; no `@/` alias exists in `tsconfig.json`.
- Shared Inertia props available on every page: `errors` + `auth` (see §4 Auth props / §5).

## 4. Rules for new code

These apply everywhere. **Feature rules live in `docs/notes/`** (an Obsidian vault: one note per feature, `[[wikilinks]]`
between them, index `docs/notes/README.md`) — read only the note for the feature at hand, and keep it current when that feature changes.

| Note | Covers |
|---|---|
| [Sales recording](docs/notes/sales-recording.md) | Recording project / rental / brokerage sales, commission slips & receiving, cutoffs, international sales |
| [Sales validation](docs/notes/sales-validation.md) | Validating sales by area / category, status changes, sale review drawer |
| [Registration, onboarding & NAO](docs/notes/registration-onboarding.md) | Become a Salesperson / Global Partner sign-up, /welcome steps, NAO + NAO approvals, the journey page |
| [FIRE](docs/notes/fire.md) | realestatetraining.ph integration: modules, exams, Rent.ph module 12, endorsement letter, certificates |
| [SMS Manager](docs/notes/sms.md) | Semaphore SMS: recipients picker, credits & requests, send job, Management section |
| [Profile, business profile & preferences](docs/notes/profile.md) | /profile, avatars, business profile & contact page, Settings › Preferences |
| [Dashboard](docs/notes/dashboard.md) | Shared dashboard, My Sales, Overview, partner & dashboard posters, LR ID |
| [Reports & statistics](docs/notes/reports.md) | Sales report / Reports cards, report layout, areas (branches), Recruits, Recruits Progress, statistics charts, leaderboards |
| [NATCON](docs/notes/natcon.md) | NATCON boards, periods / cutoffs, reach, My NATCON sales |
| [Management](docs/notes/management.md) | Management cards / tabs, agents & teams, transfers, designations, editing profile & upline, agent activity, documentation |
| [People & reach](docs/notes/people-and-reach.md) | Global Partners, Genealogy, office secretaries, My Team — who sees whom |
| [Superadmin tools](docs/notes/superadmin-tools.md) | Sign in as a user (impersonation), View as role |
| [Legacy data](docs/notes/legacy-data.md) | Imports from lr_legacy: members, sales, teams, ids, registration status, fill-existing |
| [Global search](docs/notes/search.md) | Navbar search: pages, people, groups; sanctioned JSON endpoints |

- **Styling**: MUI `sx` prop only, following the wrapper style of
  `resources/js/components/utils/StyledButton.tsx` (spread props, merge caller `sx` last).
  Do **not** add Tailwind classes or styled-components/`styled()` — both are installed but
  unused (`docs/ARCHITECTURE.md` §6); keep it that way.
  Inputs: `components/utils/StyledTextField.tsx` / `StyledAutocomplete.tsx` (filled, token-coloured) with the label printed
  above in `FormHelperText` — as in the record-sale forms and the Sales validation sale form. Don't use bare MUI
  `TextField`/`Autocomplete` in forms.
- **Colors / dark mode**: never hardcode hex in components — use the `var(--lr-*)` tokens from
  `resources/css/app.css` (`--lr-text-primary`, `--lr-surface`, `--lr-border`, `--lr-primary`, …),
  which flip under `html.dark`. **The Leuterio Realty palette**: the brand's deep blue (`--lr-primary`, #0055b3 / dark #6aa6ff)
  for actions, links and selection; the logo's red **only as a highlight** — `--lr-accent` (fills / marks: the active
  sidebar marker, the tab indicator, the bar beside `SectionTitle`, menu counter badges) and
  `--lr-accent-ink` (red text) — never for large areas or as a second action colour; near-black / charcoal text on white,
  true near-black surfaces in dark mode (contrast checked AA). Font: Inter (loaded in `app.blade.php`, set in `appTheme.ts` +
  body). Cards: `--lr-shadow` (a hairline shadow in light, none in dark). Focus rings mix the token with `color-mix()`. **NATCON** keeps the portal palette; its mark is `components/natcon/NatconTrophyIcon` (gold star on a swoosh, its own
  colours — the menu icon, the NATCON header, the Qualifiers card). MUI's palette (`providers/appTheme.ts`) mirrors them — change both
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
  `s3`; returns the **full object URL**; `discardUploaded()` on failure).
- **Feedback (every page, nothing to add per form)**: `components/utils/feedback/AppFeedback.tsx`, mounted once in `app.tsx`, listens
  to Inertia's router events: a small **"Saving… / Uploading n%" modal** for every non-GET visit (after 350 ms, so quick saves
  don't flash it; not for background writes with `only: [...]` or `async`), and **toasts** (one at a time): the server's flash
  — `->with('success' | 'warning' | 'error', '…')`, shared as `flash` — validation errors ("Please check the form: …"), a write
  landing on the Error page, network / server failures. Client-side ones: `toast.success / error / warning / info` from
  `helpers/toast.ts`. There's no inline flash banner any more — don't add one.
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
- **Never hardcode a person**: greet with `auth.first_name`, build personal links from the signed-in
  user (`helpers/userLinks.ts`). "Online now" is real presence from the database session store
  (`OnlineUsersService`, shared as `online_users` to back-office roles only), shown by
  `SideRail` via `OnlineUsersPanel` — pinned in the right rail on desktop, a face strip on
  smaller dashboard screens. **Realtime**: Laravel Reverb (WebSockets, `php artisan reverb:start`, started by
  `composer dev`) + a presence channel `portal.online` (`routes/channels.php`; every active user joins,
  members see id/name/avatar/role). The client joins once per tab in `helpers/presence.ts` (outside
  React, so page visits don't rejoin) and authorizes with the fresh `XSRF-TOKEN` cookie. If the socket
  is down, `hooks/useOnlineUsers.ts` falls back to the 60s partial-reload poll.
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
