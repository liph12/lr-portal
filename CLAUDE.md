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
  Inputs: `components/utils/StyledTextField.tsx` / `StyledAutocomplete.tsx` are MUI's outlined field on the theme (same as
  the Sales validation sale form); pass `label` for a floating label, or print a label above as the record-sale forms do.
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
- **Dashboard › Overview = sales at a glance** (`DashboardController::overview`, same reach as reports: back office the
  whole system with top teams; team leader their team with top sub-teams; unit manager their sub-team; others 403): date
  range, top 5 agents / groups, then `ReportStatistics`.
- **Recruits Progress** (Reports › Recruits Progress `/reports/recruits-progress`; `RecruitProgressService`): recruits
  (signed up in range) vs recruits who sold (any recorded sale), their total valid sales (any date), NAO / FIRE of those
  still in training; grouped by team, sub-team / unit manager, or sponsor (`agent_attributes.referral_id`); top areas +
  sign-ups over time. Same reach as Recruits; leaders lose the groupings that would only show themselves, and a sponsor scope (an agent's own
  recruits, or a clicked sponsor) groups by team / unit manager / location.
  KPIs are `RecruitsPanel` (ordinary stat tiles + FIRE / NAO / Overall cards: not started · on progress · finished,
  for recruits without a sale — the legacy numbers, in this app's style). Groupings: team, unit manager, location
  (area), sponsor. Rows drill down by `team_id` / `sub_team_id` / `area` / `sponsor_id` (merged with the reader's
  reach, which wins) and show the large `ReportScopeHeader`; "View these recruits" opens Reports › Recruits with the
  same selection. The summary is
  one area × month pass, summed in PHP (each pass over ~20k recruits is ~0.5s).
- **Recruits** (Reports › Recruits `/reports/recruits`, and My Team › Recruits; `RecruitmentService`): members by status (now),
  new recruits signed up in the date range (`agents.created_at`), and onboarding of recruits **without any sale** (local or
  international): NAO = `agent_attributes.nao_video_tracker` % (100 = finished), FIRE = `fire_certificates` with 3 = 100%
  (capped). Cards first, then the server-paged trainees table (filter NAO / FIRE level / status). Reach: back office all;
  leaders their team / sub-team; anyone else with reports the recruits they sponsored (`sponsor_id` lock,
  `ReportsController::recruitLock`) (menu pseudo-grants `_backoffice` / `_leader`). Portable SQL only (CASE, not
  LEAST — tests run on SQLite).
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
  Shown in Management › Agents (column + filter) and on the agent profile.
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
  invalid, grey cancelled)
  → a server-paged table per status (pending, valid, invalid, cancelled) with client, agent, project + developer /
  brokerage area / closing agent, unit, price, reserved, date added and the files (POT; remittance + deposit slips).
  Status via `StatusMenu` → `ValidateSaleRequest`; `setStatus` stores `validated_by` / `validated_at`, appends to
  `update_logs`, logs `sale.validate` and refreshes the agent's activity.
  Clicking an agent opens `AgentSalesPanel` (`?agent=ID`, partial reload of `agentSales`, `agent_dates=all` for every date):
  their sales client first in Project / Brokerage / Rental tabs (newest 100 each), with status chips and `StatusMenu`.
  Clicking a sale (table row → right drawer; agent panel card → expands in place) loads `saleDetail` (`?sale=ID`,
  `SaleValidationService::detail`: agent, client, property, payment, files, history) into `SaleDetailsForm`, where every
  field is editable: `PUT …/sales-validation/{sale}` (`UpdateValidatedSaleRequest`, keys = column names, fields by
  category, measurements optional but cleared when the property type doesn't use them) → `SaleValidationService::update`
  (`EDITABLE` map) writes one `update_logs` line listing every change, logs `sale.edit`, recomputes `client_age` from a new
  birthdate, then sets the status. Pickers: `editOptions` prop. Controls inside a row stop the click (`stop`).
- **Sign in as a user** (superadmin only; Management › Agents row action, agent profile button): `POST /impersonate/{user}`,
  `DELETE /impersonate`, `ImpersonationService` (session key `impersonator_id`; the session id is regenerated on each switch
  so slow background requests can't undo it). Never on superadmins or inactive users; `ImpersonationBanner` in `AppLayout`;
  activity logs get `impersonated_by`. Shared: `auth.impersonator`, `auth.can.impersonate`.
- **My Team** (`/my-team`, `MyTeamController`, `TeamLeadershipService`): for whoever leads a team (`teams.agent_id`) or
  sub-team (`sub_teams.agent_id`) — leadership comes from the data, not the role; shared as `auth.leads` (drives the
  menu item + switcher). Overview = the report locked to their group (opens on last month); Members (server-paged —
  teams reach 12k members); Sub-teams. Team leaders: add agents with no team, move members between their sub-teams,
  create/edit sub-teams led by their members (all via `TeamManagementService::transfer`, history kept). Unit managers:
  monitor only. The Sub-teams page shows, for a date range (default last month), each sub-team's sales and its unit
  manager's own sales, ranked either way (`SalesReportService::totals`). A team leader can open any sub-team of their team (`?sub_team=`, read-only, `group.parent` set).
  Menus treat leaders as holding the pseudo-permission `_leader` (`helpers/permissions.ts`). Every write goes through `Requests/Portal/MyTeam/*` (`leadsTeam` on the `{team}` in the URL). Leaders
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
  Sales — brokerage and rental rank agents). **Each report is also its own permission** `report_{slug}` (`ReportsController::permission`,
  migration `000024`; granted to every role that had view_reports) — checked on the page and in `available()`, and as
  `requires` on the menu children (all-of, on top of `permission`'s any-of). Settings › Roles & permissions groups
  permissions by `Permission::SECTIONS` (report_* → Reports); add new permission names to a section there. Both pages render `components/reports/SalesReportView.tsx` (View Sales with view tabs, a report without).
  Drill-down: Teams / Sub-teams / Developers rows open that group's top agents (`team_id` / `sub_team_id` /
  `developer_id` filter → `SalesReportService::sales()` scope; teams by the stint covering each reservation date;
  shared `scope` prop names it for the chip).
- **Areas** (offices): `config/areas.php` (legacy LOCATIONS_LATEST + `abroad`) → `agents.area` via `App\Support\Areas`
  (state, then city: own area name > listed place > contains name > contains place; non-PH country → abroad).
  The `Agent` model re-derives it when state/city/country_code change; rows written with `DB::table` (imports)
  must set it themselves or run `php artisan agents:assign-areas`. Reports: `areas` view / "Sales by Area" card,
  drill by `area` (`unassigned` for agents without one); Management › Agents shows it.
- **Report layout**: the ranked table comes first (name, Area / location, Team where relevant, Total sales — no
  count / average / share columns); statistics (`components/reports/ReportStatistics.tsx`: tiles, trend, by
  category, by area, by client country — codes and legacy names merged via `Countries::resolve`, top 10 + Other —
  by client gender, by client age, by property type, and Top developers with % share of project sales when the report includes
  project sales) sit underneath. A drill-down shows `ReportScopeHeader` (photo, name, facts, total, "Show
  everyone") under the title instead of a chip; `scope` carries `avatar` + `facts`. People rows open the read-only agent profile `/agents/{agent}`
  (`AgentProfileController`, view_reports or team managers; same service with an `agent_id` scope).
  Date ranges use `components/utils/DateRangeField.tsx` (free `@mui/x-date-pickers` DateCalendar + dayjs, quick
  ranges + click first/last day) — MUI's DateRangePicker is Pro-only, don't add it.
- **Charts / statistics**: `/superadmin/statistics` (`StatisticsController` → `StatisticsService`,
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
- **Legacy data**: the old system is restored locally as database `lr_legacy` (connection `legacy`,
  read-only use). Imports are artisan commands backed by services in `app/Services/Legacy/`
  (`legacy:import-members`; legacy SUPERVISOR = `team_leader`, there is no supervisor role): idempotent by email, `--dry-run` rolls back, rejects go to
  `storage/app/private/legacy-import/`. Mapping and decisions: `docs/legacy-migration/`.
  `agents.agent_type` is `Agent::TYPES` (local, global_partner): global = legacy `national_intern` international
  + joined ≥ 2024-02-01 + country not PH (`Agent::typeFromLegacy`, `LegacyAgentOrigin`, `legacy:import-agent-types`
  re-applies it and syncs the `global_partner` role). `agents.country` / `country_code` via `App\Support\Countries`
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
  any profile, sales only with view_reports; superadmins get a "Sign in" button per row, `can_impersonate`; team leaders / unit managers also search, finding only the current members of the groups
  they lead — `TeamLeadershipService::ledMemberIds` — whose profiles they may open with sales), teams / sub-teams / areas from `GET /search/groups` (`GroupSearchService`, same reach as
  reports: back office → any group, opening `/reports/top-agents?team_id|sub_team_id|area=`; leaders → only groups they
  lead, opening My Team; `auth.can.search_groups`) — with `/search/agents`, the **only sanctioned JSON endpoints**, because typeahead can't be an
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
