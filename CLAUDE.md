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
  superadmin/superadmin-{section}.php,  admin/admin-{section}.php
resources/js/
  Pages/             one component per inertia('...') string, path mirrors the string
  components/        AppNavbar, AppSidebar;  layouts/  cards/  utils/{forms,tables,user}/
  hooks/  helpers/  providers/  types/
```

## 2. Reference implementation — copy this flow

`GET /superadmin/dashboard/create-sale/project`, end to end:

1. **Route** — `routes/superadmin/superadmin-dashboard.php:16`, named `superadmin.create-sale.project`,
   inside `prefix('superadmin')->middleware('role:superadmin')` (`routes/web.php:27`).
2. **Controller** — `app/Http/Controllers/Portal/SuperAdmin/Reports/SaleController.php:15-20`:
   `createProject()` → `inertia('SuperAdmin/Dashboard/CreateSale/Project', ['developers' => ...])`.
   Always the lowercase `inertia()` helper — `Inertia::render` is not used in this codebase.
3. **Page** — `resources/js/Pages/SuperAdmin/Dashboard/CreateSale/Project.tsx`: typed destructured
   props (`{ developers }: { developers: SalesSource[] }`), persistent layout via
   `Project.layout = (page: ReactNode) => <DashboardLayout children={page} />` (line 28),
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
- **Validation**: a Form Request in `app/Http/Requests/` for **every non-GET route**.
  No inline `$request->validate()`. (`app/Http/Requests/` doesn't exist yet — create it with
  the first write endpoint; nothing in the repo validates today, see docs §5.)
- **Authorization**: Policies in `app/Policies/` + `authorize()` in controllers (none exist yet).
  `app/Http/Middleware/RoleMiddleware.php` must return an Inertia-compatible redirect —
  never JSON (its current `response()->json(..., 403)` at line 21 is a defect, see §5).
- **Layouts**: persistent `.layout` static pattern only
  (`Project.layout = (page) => <DashboardLayout children={page} />`, `CreateSale/Project.tsx:28`).
  Never wrap a layout inside the page's render. `AppLayout` owns the viewport (`100vh`,
  `overflow: hidden`) and its `<main>` pane is the only page scroller — pages must not set
  `100vh` heights or their own `overflowY`.
- **Auth props**: shared from `app/Http/Middleware/HandleInertiaRequests.php` `share()` **only**
  (currently empty at lines 36-42 — that's where auth sharing goes). No `Inertia::share` in
  providers; no per-page `'user' => Auth::user()` props.
- **Forms**: `useForm` from `@inertiajs/react` — and actually use its `post/put`, `errors`,
  `processing`, not just `data/setData` (the existing `ClientForm.tsx:32` misuses it — §5).
- **Tables**: no pattern exists yet (`components/utils/tables/TopAgentsTable.tsx` is a hardcoded
  demo). **Ask before building one.**
- **Navigation**: Inertia `<Link>` / `router` only (`components/AppSidebar.tsx:82`).
  No raw `fetch`/`axios`/`window.location` for page transitions.
- **Controllers**: always suffixed `Controller`, in the `Portal\{Role}` namespace of the
  portal they serve.

## 5. Do not imitate

- `app/Http/Controllers/Portal/SuperAdmin/Statistics/*.php` — four empty stub classes with no
  `Controller` suffix, no methods, no routes.
- `RoleMiddleware.php:21` — the JSON 403 inside the Inertia stack (unrenderable by the client).
- `resources/js/components/utils/tables/TopAgentsTable.tsx` — hardcoded rows, zero props,
  `totalSlaes` typo.
- The two form patterns that never submit:
  `useForm` as bare state (`components/utils/forms/ClientForm.tsx:32`, `ProjectSaleForm.tsx:47`)
  and `useState` + `window.location.href` (`Pages/User/Auth/Stepper/CreateAccount.tsx:180`,
  `Pages/User/Auth/CreatePassword.tsx:32`).
- `app/Providers/AppServiceProvider.php:24-34` — `Inertia::share` auth sharing from a provider
  (belongs in `HandleInertiaRequests::share()`; also ships `role` as a whole roles collection).
- Also: placeholder constructors (`SaleController.php:10-13` `// to do`), per-page
  `'user' => Auth::user()` props (7 controllers), lowercase page filenames.

## 6. Comments

- Explain **why**, not what. One line max.
- No JSDoc/docblocks unless the signature is non-obvious.
- Never leave notes describing your own edit — no "changed X to Y", no `// to do` markers,
  no commented-out code left behind.
