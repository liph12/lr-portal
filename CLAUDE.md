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
npm run build         # production build — the only frontend check (no tsc/eslint installed)
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
  Pages use `Index.tsx` (one legacy lowercase exception `Pages/SuperAdmin/Accounting/index.tsx` —
  do not add more).
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
  (403/404/500/503; JSON callers still get JSON).
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
  **one** `proof_of_transaction` (`ProjectSaleService`); a rental (`RentalSaleService`, no developer)
  stores `remittance_slip` (required — its proof of transaction) and `deposit_slip` (optional), plus
  `closing_agent` / `partner_agent` **by name** (picked by id via `GET /search/agents`, the second
  sanctioned typeahead endpoint). A brokerage sale (`BrokerageSaleService`) belongs to an active
  `brokerage_areas` row instead of a developer, with the same two slips and no agents. The
  rental/brokerage upload step is `forms/SaleSlipsForm.tsx`; steppers use `hooks/useSaleSteps.ts`
  (never blocks navigation — leaving a step only flags its missing fields; submit checks all). Shared sale rules live in `Requests/Portal/Sales/SaleRequest.php`;
  the shared sale row + client details in `Services/SaleRecord.php`. **Measurements follow the
  property type** (`ProjectPropertyType::WITH_*`, mirrored in `helpers/projectSaleFields.ts`): condo →
  unit type + floor area, house & lot / townhouse → floor + lot area, lot only → lot area; required
  when shown, nulled otherwise; UI via `forms/PropertyMeasurementFields.tsx`. Tests use `Storage::fake('s3')`.
- **Profile / avatars**: `/profile` is shared by every role (`routes/profile.php`, required inside the
  `auth` group; `Portal\ProfileController`). A user's agent record is created on first use by
  `ProfileService::agentFor()`. Photos are cropped to 512px WebP by `ProfilePhotoService` and the full
  URL is stored in `agents.avatar` (shared as `auth.avatar`). Render people with
  `components/utils/user/UserAvatar.tsx` (photo, falling back to initials). Flash messages:
  `components/utils/FlashBanner.tsx`; titled panels: `components/cards/SectionCard.tsx`.
- **Dashboard (shared)**: `/dashboard/{main,overview,view-sales,record-sale/...}` (`routes/dashboard.php`,
  `Portal\DashboardController`, pages in `Pages/Portal/Dashboard/`) is the **same for every role** and is
  everyone's home (`User::homeUrl()` → `dashboard.index`; old `/superadmin/dashboard/*`, `/admin/dashboard`,
  `/staff/dashboard` redirect there). Menus reuse one `dashboardRoute` node in `app-data.tsx`; roles
  without a portal (agent, team leader, unit manager…) get `memberRoutes`. **Record Your Sale** is the only
  gated part: `record_sales` permission (`AgentTransactionPolicy::create`; granted to agent, team_leader,
  unit_manager; superadmin always) — hide UI with `auth.permissions`. Field roles' sales are credited to
  their own agent (`SaleRecord::creditedAgent`); back-office recorders stay `recorded_by` only.
- **Portals & gates**: each role with a portal (`User::PORTALS` = superadmin, admin, staff) has its own
  prefix + `role:` group in `routes/web.php`; everyone else lives on `/profile`. Sign-in and `/home`
  go to `User::homeUrl()` (the shared dashboard); a remembered page is only honoured inside the shared pages or the user's own
  portal. **Every permission name is a gate** (`AppServiceProvider` `Gate::before`): guard routes with
  `->middleware('can:view_reports')`, and add the same `permission` key to the menu item in
  `app-data.tsx` (`adminRoutes`/`staffRoutes`) so it's hidden too. Superadmin passes every gate.
  Menus, breadcrumbs and search all come from `hooks/usePortalRoutes.ts`; shared pages for several
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
  sort keys equal to the column `field`s — see `TeamDirectoryService`). Status cells: `StatusChip` /
  `StatusMenu` (PATCH `{status}`, confirm for destructive ones); photo cells: `PhotoUploadButton`.
- **Management** (`/superadmin/management` and `/admin/management`, same pages in
  `Pages/Portal/Management/`, routes from `routes/management.php` called per portal, guarded by
  `can:manage,Team` = `TeamPolicy` → superadmin + admin): Teams, Sub-teams, Agents, Team transfers.
  Logic in `TeamManagementService` (writes) / `TeamDirectoryService` (reads). Team & sub-team statuses
  are `Team::STATUSES` (active, inactive = paused, deactivated = closed: ends every active stint today
  and deactivates its sub-teams). A **transfer** never edits history: it closes the current
  `team_agents` / `sub_team_agents` row (`inactive`, `transferred_at` = date) and opens a new active one —
  one active stint per agent per table. Team photos go through `ProfilePhotoService::uploadSquare`
  (`team-logos/`). Agent status/photo: admins may change agents and staff but not admins/superadmins
  (`UserPolicy::updateStatus/updatePhoto`).
- **View as role** (superadmin testing): profile menu → "View the portal as …" (`POST/DELETE /view-as`,
  `ViewAsService`, session key `view_as_role`). `ApplyViewAsRole` middleware (before
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
- **Charts / statistics**: `/superadmin/statistics` (`StatisticsController` → `StatisticsService`,
  sales dated by `reservation_date`). Charts are plain MUI in `components/charts/` (`StatTile`,
  `MonthlyColumnChart`, `BarList`, `ShareBar`) — no chart library. Series colours are the validated
  `--lr-series-1..3` tokens in fixed order (light/dark in `app.css`); text always uses text tokens;
  every chart carries a visually hidden data table (`srOnly`). Money: `helpers/formatNumber.ts`.
- **Leaderboards** (`components/utils/SalesLeaderboards.tsx`, in `SideRail` under "Online now" on every
  route): gated by the `view_leaderboards` permission (grant it per role in Settings). Data is the
  **optional** shared prop `leaderboards` (`LeaderboardService`), computed only when the panel asks via
  `router.reload({ only: ["leaderboards"] })` — use the same pattern for other heavy side panels.
  Optional props are dropped on the next visit, so `hooks/useLeaderboards.ts` keeps the last result
  in a module cache (refetched only when older than 5 min).
  Boards: agents, brokerage (agents by brokerage sales), teams, projects, developers for this and last month. A month = valid sales
  **reserved** in it and **encoded** (`agent_transactions.created_at`) by its cutoff in
  `sales_cutoffs` (imported by `legacy:import-sales-cutoffs`; no row = month still open). Top Teams
  credits a sale to the team its agent was on at the reservation date (`team_agents` history).
- **Legacy data**: the old system is restored locally as database `lr_legacy` (connection `legacy`,
  read-only use). Imports are artisan commands backed by services in `app/Services/Legacy/`
  (`legacy:import-members`; legacy SUPERVISOR = `team_leader`, there is no supervisor role): idempotent by email, `--dry-run` rolls back, rejects go to
  `storage/app/private/legacy-import/`. Mapping and decisions: `docs/legacy-migration/`.
  **`agents.id` = legacy `members.id`** (and is the agent's referral number), so later imports
  (teams, sales) join legacy member ids straight onto `agents.id` — never via a lookup table.
  Sales (`legacy:import-sales`): `agent_transactions.id` = `salesreport.id`; category from legacy
  `developers.isbroker` (0 project, 1 brokerage → `brokerage_areas`, 3 rental); `agent_id` from
  `agentid → members.memberid → members.id`. Rental/brokerage property details live in their own
  tables (see `docs/legacy-migration/sales.md`). Teams (`legacy:import-teams`): `teams.id` /
  `sub_teams.id` = legacy ids; members via `memid`/`memID`/`LeadID` (= `members.id`), never the
  legacy `agentid`; per agent only the newest membership can be `active` (see `teams.md`). Pages that
  list users must page/search server-side — there are ~83k users now.
- **Global search** (navbar, `components/utils/search/GlobalSearch.tsx`): pages come from `app-data`
  routes via `helpers/searchPages.ts` (client-side); people come from `GET /search/users`
  (`Portal\SearchController`) — with `/search/agents`, the **only sanctioned JSON endpoints**, because typeahead can't be an
  Inertia visit. Don't add other JSON endpoints without the same reason. Who may do what is shared as
  `auth.can.{access_superadmin, search_users, manage_users}` — use these flags, not role names, in the UI.
- **Navigation**: Inertia `<Link>` / `router` only (`components/AppSidebar.tsx:85`).
  No raw `fetch`/`axios`/`window.location` for page transitions.
- **Controllers**: always suffixed `Controller`, in the `Portal\{Role}` namespace of the
  portal they serve.

## 5. Do not imitate

- The form pattern that never submits: `useState` + `window.location.href` (`Pages/User/Auth/Stepper/CreateAccount.tsx:180`,
  `Pages/User/Auth/CreatePassword.tsx:32`, `Pages/User/Auth/Register.tsx:239`).
- Also: per-page
  `'user' => Auth::user()` props (7 controllers), lowercase page filenames.

## 6. Comments

- Explain **why**, not what. One line max.
- No JSDoc/docblocks unless the signature is non-obvious.
- Never leave notes describing your own edit — no "changed X to Y", no `// to do` markers,
  no commented-out code left behind.
