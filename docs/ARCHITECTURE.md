# lr-portal — Architecture Survey

> Read-only survey of the working tree at commit `d4c9a32` (branch `master`), 2026-09-14.
> Every claim below cites a real file. Things that were looked for and **do not exist** are
> marked as such; things that could not be determined are listed in [§9 Unclear](#9-unclear--not-derivable-from-the-code).

## 1. Stack at a glance

| Layer | What | Evidence |
|---|---|---|
| Backend | Laravel 12, PHP ^8.2 | `composer.json` |
| Bridge | Inertia 2 (`inertiajs/inertia-laravel` ^2.0, `@inertiajs/react` ^2.3.13) | `composer.json`, `package.json` |
| Frontend | React 19 + TypeScript (all `.tsx`/`.ts`, zero `.jsx`/`.js` in `resources/js/`) | 52 `.tsx` + 6 `.ts` files |
| UI | MUI v7 (`@mui/material`, `@mui/icons-material`), styled via the `sx` prop only | see [§6](#6-ui-library-and-styled-wrappers) |
| Build | Vite 7 + `laravel-vite-plugin`, Tailwind 4 plugin (installed but unused — [§8](#8-inconsistencies--two-patterns-for-the-same-thing)) | `vite.config.js` |
| DB | Single MySQL connection (`DB_CONNECTION=mysql`); sessions in DB | `.env`, `config/database.php:19` |
| Tests | Pest 4 — **scaffold only, no application tests** (`tests/Feature/ExampleTest.php` is the Laravel example, and it fails: it expects `GET /` → 200 but `routes/web.php:6-8` redirects to `/login`) | `tests/` |
| Dev runner | `composer dev` → concurrently: `artisan serve` + queue + pail + `npm run dev` | `composer.json` scripts |

The app currently runs **dev-server-only**: `public/hot` exists, `public/build/` does not. A production build has never been produced (and cannot be — see [§8.3](#83-broken-references) on the `app.js` entry mismatch).

---

## 2. Directory structure

### 2.1 `app/` — 23 files

```
app/
├── Http/
│   ├── Controllers/
│   │   ├── Controller.php                  ← empty abstract base (body is `//`)
│   │   ├── UserController.php              ← all auth: login/register/verify pages, loginAttempt, logout
│   │   └── Portal/                         ← one namespace per portal (role)
│   │       ├── Admin/
│   │       │   └── AdminDashboardController.php     ← single dashboard() method
│   │       └── SuperAdmin/
│   │           ├── AccountingController.php          ┐
│   │           ├── DashboardController.php           │ one controller per sidebar
│   │           ├── DocumentationController.php       │ section; all except
│   │           ├── HumanResourceController.php       │ DashboardController are a
│   │           ├── InboxController.php               │ single index() returning
│   │           ├── ManagementController.php          │ inertia(...)
│   │           ├── SettingsController.php            ┘
│   │           ├── Reports/
│   │           │   └── SaleController.php            ← create-sale pages; the app's only DB query
│   │           └── Statistics/
│   │               ├── AgentStatistics.php           ┐ four EMPTY stubs (class body
│   │               ├── DeveloperStatistics.php       │ is `//`); no routes point to
│   │               ├── SubteamStatistics.php         │ them; note: no "Controller"
│   │               └── TeamStatistics.php            ┘ suffix
│   └── Middleware/
│       ├── HandleInertiaRequests.php       ← unmodified Inertia scaffold; share() is empty
│       └── RoleMiddleware.php              ← the app's entire authorization layer
├── Models/
│   ├── User.php                            ← auth model; roles()/hasRole()/hasPermission()
│   ├── Role.php                            ← name/label + belongsToMany User, Permission
│   ├── Permission.php                      ← seeded but never checked at runtime (dead)
│   └── Entities/
│       └── Developer.php                   ← empty class body; the only domain model
├── Providers/
│   └── AppServiceProvider.php              ← only provider; Inertia::share(['auth' => ...])
└── Services/
    └── AuthUserService.php                 ← only service; login session + post-login redirect
```

**What belongs where (as practiced):**

- `Http/Controllers/Portal/{Role}/` — one controller per portal section; controllers only render Inertia pages (no stores/updates exist yet).
- `Http/Controllers/Portal/SuperAdmin/Reports/`, `.../Statistics/` — deeper grouping by feature area within a portal.
- `Models/` — auth/RBAC models at the root; `Models/Entities/` — domain models (currently just the `Developer` stub). Nothing documents this split — see [§9](#9-unclear--not-derivable-from-the-code).
- `Services/` — business logic extracted from controllers (currently only auth).

**Conventional Laravel locations that do NOT exist** (verified with `ls`/`grep`): `app/Http/Requests/` (FormRequests), `app/Policies/`, `app/Rules/`, `app/Http/Resources/`, `app/Jobs/`, `app/Events/`, `app/Listeners/`, `app/Actions/`, `app/Repositories/`, `app/Enums/`, `app/Console/`, `config/inertia.php`, `routes/api.php`.

### 2.2 `resources/js/` — 58 files (52 `.tsx`, 6 `.ts`)

```
resources/js/
├── app.tsx                       ← Inertia entry point (17 lines, quoted in §3)
├── app-data.tsx                  ← static config: `useAppRoutes` nav tree, create-sale steps,
│                                    property types, countries. Plain consts, despite `use` names.
├── Pages/                        ← Inertia page components; path mirrors the inertia('...') string
│   ├── Admin/AdminDashboard.tsx
│   ├── Home/Index.tsx            ← rendered by NO controller (dead page)
│   ├── SuperAdmin/
│   │   ├── Accounting/index.tsx  ← lowercase filename (lone exception; see §4)
│   │   ├── Dashboard/{Index, CreateSale/{Index,Project,Rental,Brokerage},
│   │   │              Overview/Index, Reports/{Index,Developer}}.tsx
│   │   └── {Documentation,HumanResource,Inbox,Management,Settings}/Index.tsx
│   └── User/
│       ├── Index.tsx
│       └── Auth/{Login,Register,Verify,CreatePassword}.tsx
│           └── Stepper/{CreateAccount,Stepper1..Stepper4}.tsx
├── components/
│   ├── AppNavbar.tsx             ← top app bar (search pill, avatar, breadcrumbs row)
│   ├── AppSidebar.tsx            ← 270px rail; renders useSidebarRoutes() + hardcoded online users
│   ├── cards/                    ← DashboardCard (dead), DashboardCardApp, DashboardCardOverview
│   ├── layouts/
│   │   ├── AppLayout.tsx         ← base shell: AppNavbar + AppSidebar + children
│   │   ├── DashboardLayout.tsx   ← wraps AppLayout; tab bar + 9.5/2.5 grid with right rail
│   │   └── CreateSaleStepperLayout.tsx  ← misnamed: not a layout, it's the sale wizard component
│   └── utils/
│       ├── Styled{Button,TextField,TextFieldPrimary,Autocomplete}.tsx  ← MUI wrappers (§6)
│       ├── AppBreadcrumbs.tsx, CreateSaleStepper.tsx,
│       │   CreateProjectSaleStepperContent.tsx,
│       │   DashboardFilters.tsx (body commented out), DashboardLeaderboards.tsx
│       ├── forms/                ← ClientForm, ProjectSaleForm, UploadPOTForm (§7.1)
│       ├── tables/               ← TopAgentsTable.tsx (§7.2) — the only "table"
│       └── user/                 ← UserOnlineAvatar.tsx (also exports User/Role types)
├── hooks/                        ← useBreadcrumbs.ts, useSidebarRoutes.ts (default exports)
├── helpers/                      ← hexToRgba.ts, routeMatch.ts, truncateText.tsx (named exports)
├── providers/                    ← AppProvider.tsx — the only provider (context, not a theme)
└── types/                        ← index.ts, app-data-types.ts (shared interfaces)
```

**What belongs where (as practiced):**

- `Pages/` — one component per `inertia('...')` string; folder nesting mirrors the URL/portal hierarchy.
- `components/` root — app chrome; `components/layouts/` — persistent layouts; `components/cards|utils|utils/forms|utils/tables|utils/user/` — everything else, loosely grouped.
- `hooks/` — `usePage()`-derived UI state (no data fetching hooks exist).
- `helpers/` — pure functions; `providers/` — React context; `types/` — shared TS interfaces (though many interfaces are declared inline in pages instead — see §8).

### 2.3 `routes/`

`bootstrap/app.php:11-15` registers only `routes/web.php` (+ `console.php`, `/up` health). `web.php` then pulls in per-section files with plain `require`:

- `routes/web.php` — `/` redirect, guest auth routes, `POST /logout`, and two role-gated groups:
  `Route::prefix('superadmin')->middleware('role:superadmin')` requiring 7 files from `routes/superadmin/` (`web.php:27-36`), and `Route::prefix('admin')->middleware('role:admin')` requiring `routes/admin/admin-dashboard.php` (`web.php:38-42`).
- `routes/superadmin/superadmin-{dashboard,management,accounting,documentation,humanresource,inbox,settings}.php` — one file per sidebar section.
- `routes/superadmin/superadmin-statistics.php` — **empty** (`<?php` only) and never `require`d.
- `routes/api.php` — **does not exist**.

---

## 3. Request flow: route → controller → `inertia()` → Pages component

One note up front: **no controller calls `Inertia::render()`**. Every render uses the lowercase
`inertia()` helper (functionally identical). The `Inertia` facade appears exactly once, for
`Inertia::share` in `app/Providers/AppServiceProvider.php:24`.

Concrete trace of the one route that carries real DB data:

**1. Route** — `routes/superadmin/superadmin-dashboard.php:16` (inside `prefix('dashboard')`, itself inside `web.php:27`'s `prefix('superadmin')->middleware('role:superadmin')`, inside `middleware('auth')`):

```php
Route::get('/project', [SaleController::class, 'createProject'])->name('superadmin.create-sale.project');
```
→ final URL `GET /superadmin/dashboard/create-sale/project`, middleware stack `web` (+ appended `HandleInertiaRequests`, `bootstrap/app.php:17-19`) → `auth` → `role:superadmin`.

**2. Controller** — `app/Http/Controllers/Portal/SuperAdmin/Reports/SaleController.php:15-20`:

```php
public function createProject()
{
    $developers = Developer::get();

    return inertia('SuperAdmin/Dashboard/CreateSale/Project', ['developers' => $developers]);
}
```

**3. Shared props merge in.** Two mechanisms coexist (see §8.2 #6):
- `app/Http/Middleware/HandleInertiaRequests.php:36-42` — the idiomatic slot, **left empty** (contributes only Inertia's default `errors` bag).
- `app/Providers/AppServiceProvider.php:24-34` — the one actually used:

```php
Inertia::share([
    'auth' => function () {
        $user = Auth::user();
        return $user ? [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->roles     // NB: singular key, plural collection
        ] : null;
    },
]);
```

**4. Root view** — `resources/views/app.blade.php` (the only Blade file; `$rootView = 'app'` in `HandleInertiaRequests.php:17`). Contains `@vite('resources/js/app.js')` (a path that does not exist — §8.3), `@inertiaHead`, `@inertia`.

**5. Client resolution** — `resources/js/app.tsx` (full file):

```tsx
import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";
import { AppProvider } from "./providers/AppProvider";

createInertiaApp({
    resolve: (name) => {
        const pages = import.meta.glob("./Pages/**/*.tsx", { eager: true });
        return pages[`./Pages/${name}.tsx`];
    },
    setup({ el, App, props }) {
        createRoot(el).render(
            <AppProvider>
                <App {...props} />
            </AppProvider>
        );
    },
});
```

Notes: exact, case-sensitive string-key lookup (no `resolvePageComponent` from `laravel-vite-plugin/inertia-helpers`); `eager: true` bundles all 26 pages into one chunk (no code splitting); no `title` callback or `progress` config; the only wrapper is `AppProvider` — **no ThemeProvider/CssBaseline** (§6).

**6. Page component** — `resources/js/Pages/SuperAdmin/Dashboard/CreateSale/Project.tsx`:

```tsx
function Project({ developers }: { developers: SalesSource[] }) {
    return ( /* ... */ <CreateSaleStepperLayout salesSources={developers} /> /* ... */ );
}

Project.layout = (page: ReactNode) => <DashboardLayout children={page} />;

export default Project;
```

Conventions visible here and repeated across `Pages/`:
- Controller props arrive as a **typed, destructured function argument** — `usePage().props` is never used for page props (its 3 usages read only `url`: `hooks/useBreadcrumbs.ts:18`, `hooks/useSidebarRoutes.ts:6`, `components/layouts/DashboardLayout.tsx:14`).
- Persistent layouts attach via the **`.layout` static**; the 9 auth pages (`User/Auth/**`) have no layout and render standalone.
- The shared `auth` prop is **consumed by no component** (grep: zero reads).

Client-side navigation is Inertia `<Link href>` (e.g. `components/AppSidebar.tsx:82`, `components/utils/AppBreadcrumbs.tsx:29`) — with exceptions catalogued in §8.2 #2.

---

## 4. Naming conventions actually in use

### PHP

| Thing | Convention | Deviations |
|---|---|---|
| Controllers | `{Name}Controller`, namespaced `App\Http\Controllers\Portal\{Role}\...` | The 4 `Statistics/` stubs drop the suffix (`AgentStatistics` etc.) |
| Methods | camelCase (`loginAttempt`, `createProject`, `viewSales`) | `UserController::CreateAccount()` is PascalCase (`UserController.php:33`); works only because PHP method names are case-insensitive — `web.php:15` calls it as `'createAccount'` |
| Services | `{Name}Service` (`AuthUserService`) | sample size = 1; no interface, no container binding (autowired) |
| Middleware | `{Name}Middleware` for custom (`RoleMiddleware`); scaffold keeps framework name | — |
| Route names | dot-notation `{role}.{section}[.{sub}]` (`superadmin.create-sale.project`) | split style: `superadmin.accounting` (no suffix) vs `superadmin.inbox.index`; and `superadmin.index` is registered **twice** (§8.2 #5) |
| Route files | `routes/{role}/{role}-{section}.php` | — |
| Typing | middleware fully typed; **controller methods have no param/return types**; `AuthUserService` untyped | mixed |
| Formatting | mixed Allman (`UserController.php:58-59`) and K&R (`RoleMiddleware.php:20`) braces; `AccountingController.php:11-16` has a method body outdented to column 0 | Pint is in `require-dev` but there is no `pint.json` and the code is not Pint-formatted |

### TypeScript / React

| Thing | Convention | Deviations |
|---|---|---|
| Component files | PascalCase `.tsx`, one component per file, **default export** | `Pages/SuperAdmin/Accounting/index.tsx` is lowercase — coupled to the lowercase render string `inertia('SuperAdmin/Accounting/index')` (`AccountingController.php:13`) |
| Pages | `function Name() {...}` + `Name.layout = ...` + `export default Name;` at the bottom | auth pages use `export default function Name()` and no `.layout` |
| Hooks | `hooks/use{Thing}.ts`, **default export** (`useBreadcrumbs`, `useSidebarRoutes`) | `app-data.tsx:16` exports `useAppRoutes` — a plain array with a hook name; `helpers/hexToRgba.ts:1` exports `useHexToRGBA` — a pure function with a hook name |
| Helpers | `helpers/{camelCase}.ts`, **named exports** (`isRouteActive`, `truncate`) | `truncateText.tsx` uses `.tsx` with no JSX (so does `app-data.tsx`) |
| Props typing | inline `interface {X}Props` in the same file (26 files); occasionally fully-inline (`AppLayout.tsx:6`) or a bare MUI passthrough (`StyledButton.tsx:3`) | `type` used only in `StyledAutocomplete.tsx` and `UserOnlineAvatar.tsx`; `interface User { name; email }` is re-declared in 7 page files instead of imported |
| Imports | deep relative paths (`../../../../components/...`) | no `@/` alias (tsconfig has no `paths`); no barrels except `types/index.ts` |

`tsconfig.json` has no `strict`, no `include`, `target: "es2015"`, and there is no `tsc`/lint/format script in `package.json` (only `dev` and `build`) — nothing enforces any of the above.

---

## 5. Where validation, authorization, and business logic live

### Validation — nowhere (server-side)

- `app/Http/Requests/` does not exist; `grep -rn "validate(\|Validator::\|FormRequest" app/ routes/` → **no matches**.
- The only input handling is `UserController.php:55`: `$data = $request->only('email', 'password');` — no rules, no throttle on `POST /login-attempt`.
- Errors reach the client only via the manual `back()->withErrors(['email' => 'Invalid credentials.'])` in `UserController::loginAttempt()` (`UserController.php:60-62`).
- Client-side, the only validation anywhere: file type/size checks in `components/utils/forms/UploadPOTForm.tsx:38-46` and the required-field walk `isStepValid()` in `Pages/User/Auth/Stepper/CreateAccount.tsx:163-170`.

### Authorization — one middleware, role-name strings

No Policies, no Gates (`grep "Gate::\|authorize(\|->can("` → no matches). The entire layer is `app/Http/Middleware/RoleMiddleware.php`:

```php
public function handle(Request $request, Closure $next, $role): Response
{
    $user = $request->user();

    if (! $user || ! $user->hasRole($role)) {
        return response()->json(['message' => 'Forbidden'], 403);
    }

    return $next($request);
}
```

- Aliased as `role` in `bootstrap/app.php:21-24`; applied at exactly two route groups (`web.php:27`, `web.php:38`).
- `User::hasRole()` (`app/Models/User.php:64-67`) runs `$this->roles()->where('name', $role)->exists()` — a fresh query per request.
- **Caveat:** the JSON 403 is returned inside the Inertia/web stack, which the Inertia client can't render as a page (`withExceptions` in `bootstrap/app.php:26-28` is empty, so nothing converts it).
- A permission layer exists in data but not in code paths: `Permission` model, `permission_role` pivot, `PermissionSeeder` — and `User::hasPermission()` (`User.php:69`) is **never called** anywhere.

### Business logic — one service + inline in controllers/models

- `app/Services/AuthUserService.php` (the entire `Services/` folder): `createSession()` wraps `Auth::attempt` + session regenerate; `redirect()` computes the post-login landing. Used only by `UserController` (constructor injection, `UserController.php:13-16`).
- Inline in controllers: the recruit-percentage arithmetic over **hardcoded constants** in `DashboardController::overview()` (`DashboardController.php:14-36`), and the unpaginated, unfiltered `Developer::get()` in `SaleController::createProject()` (`SaleController.php:17`) — the app's only Eloquent query. (`developers` is seeded with ~680 rows by the 713-line `database/seeders/DeveloperSeeder.php`, and its `status` column is never filtered.)
- On models: `User::hasRole()/hasPermission()/permissions()` (`User.php:49-72`). Note `User::permissions()` returns a flattened `Collection`, not a relationship, and `User::role()` (`User.php:54-57`) is a `belongsTo` with **no backing `users.role_id` column** in any migration — dead code that would throw if called.

**Known-broken logic worth flagging** — `AuthUserService::redirect()` (`AuthUserService.php:21-28`):

```php
$role = $user->roles[0];                 // throws if a user has no roles
$dashboard = $role->name.'.index';       // only 'superadmin.index' exists as a route name
return redirect()->intended(route($dashboard));
```
`RoleSeeder` seeds `superadmin`, `admin`, `staff`, `secretary`; the admin route is named `admin.dashboard` (`routes/admin/admin-dashboard.php:6`), so any non-superadmin login throws `RouteNotFoundException`. And `superadmin.index` is defined twice (§8.2 #5), so even superadmins land on `/superadmin/management`, not the dashboard.

---

## 6. UI library and Styled* wrappers

**MUI v7 is the UI library**, used directly in every component. Styling is done **exclusively through the `sx` prop** (plus occasional raw `style={{}}` on `<Link>`/`<img>`).

**The `Styled*` components are not `styled()` calls.** `grep -rn "styled" resources/js` → zero matches — no `@mui/material/styles` `styled()`, no `@emotion/styled`, no `styled-components` import exists in the frontend. The four `Styled*` files in `resources/js/components/utils/` are ordinary wrapper components that spread props onto the MUI component and inject default `sx`:

`components/utils/StyledButton.tsx` (full file):

```tsx
import { Button, ButtonProps } from "@mui/material";

export default function StyledButton({ children, sx, ...props }: ButtonProps) {
    return (
        <Button
            {...props}
            disableElevation
            sx={{
                textTransform: "none",
                borderRadius: 99,
                fontWeight: 500,
                ...sx,          // caller sx merges over the defaults
            }}
        >
            {children}
        </Button>
    );
}
```

The other three follow the same shape with variations:
- `StyledTextField.tsx` — defines its own props contract (`CustomTextFieldProps` at lines 5-14: `name`, `value`, `error?: string | null`, `handleChange?`, plus `params?` for Autocomplete render-input) and renders a grey-filled `Box`-wrapped `TextField` (focus ring, Google-blue `#1a73e8` / error-red `#d93025`) with an error `<Typography>` below (lines 79-87).
- `StyledTextFieldPrimary.tsx` — a *second* TextField wrapper with the opposite design (square corners, plain `TextFieldProps` passthrough). Only referenced inside a commented-out block of `DashboardFilters.tsx` — effectively dead.
- `StyledAutocomplete.tsx` — `Autocomplete` passthrough styled via `slotProps` (paper/listbox `sx`), hardcoding a navy/blue palette.

**Theming: none.** `createTheme()` is never called; `ThemeProvider` is imported in `providers/AppProvider.tsx:9` but never rendered; no `CssBaseline`. `AppProvider.tsx:27`'s `useTheme()` therefore returns MUI's default theme (its `lg` breakpoint drives the `desktop` flag). Colors are hardcoded hex literals repeated across ~30 files (`#1a73e8`, `#5f6368`, `#f1f3f4`, `#d93025`, …), and fonts are set ad hoc (`fontFamily="Google Sans Code"` in e.g. `components/cards/DashboardCardOverview.tsx`, loaded via a Google Fonts `<link>` in `app.blade.php`).

**Installed but unused styling machinery** (all verified unused): `styled-components` ^6.1.19 and `@mui/styled-engine-sc` ^7.3.6 (no Vite alias to activate the sc engine, so MUI runs on its default Emotion engine); Tailwind 4 (`@tailwindcss/vite` in `vite.config.js`, `resources/css/app.css` has `@import "tailwindcss"`, but `className=` appears **zero** times in `resources/js`); `axios` (never imported — Inertia bundles its own copy). `framer-motion` is real but used once (`Pages/User/Auth/Stepper/CreateAccount.tsx:11`).

---

## 7. Forms, tables, and API calls — representative examples

### 7.1 Form — Login (the only end-to-end working form)

The working pattern is Inertia's **`<Form>` component with uncontrolled inputs and render-prop state** — no `useState`, no `useForm`.

**Client** — `resources/js/Pages/User/Auth/Login.tsx`:

```tsx
// Login.tsx:77
<Form action="/login-attempt" method="post">
    {({ processing, errors }) => (
        <Stack gap={2}>
            {/* Login.tsx:113-116 — server error surfaces via the shared errors bag */}
            <StyledTextField
                name="email"
                placeholder="you@example.com"
                error={errors.email ?? null}
            />
            {/* ... password field (receives no error prop) ... */}
            {/* Login.tsx:160-163 */}
            <StyledButton type="submit" variant="contained" loading={processing} fullWidth>
```

**Route** — `routes/web.php:18` (guest group): `Route::post('/login-attempt', [UserController::class, 'loginAttempt']);`

**Controller** — `app/Http/Controllers/UserController.php:53-66`:

```php
public function loginAttempt(Request $request)
{
    $data = $request->only('email', 'password');
    $authorized = $this->authUserService->createSession($data, $request);

    if(!$authorized)
    {
        return back()->withErrors([
            'email' => 'Invalid credentials.',
        ]);
    }

    return $this->authUserService->redirect();
}
```

**Service** — `app/Services/AuthUserService.php:9-19`: `Auth::guard('web')->attempt($credentials)` + `$request->session()->regenerate()`.

Failure round-trips back to the same page; Inertia puts the flashed bag into `errors`, which the `<Form>` render-prop exposes — that is the app's entire validation-display pipeline. CSRF is handled invisibly (Laravel's `web` group + Inertia's `XSRF-TOKEN` cookie; there is no csrf meta tag and no configured axios instance).

*Caveat: this is one of three coexisting form patterns — the other two never submit anything. See §8.1.*

### 7.2 Table — `TopAgentsTable`

There is **no table abstraction** (no MUI `<Table>`, no DataGrid, no pagination/sorting/filtering anywhere — server-side `paginate()` is never called). The one "table" is a hardcoded list:

`resources/js/components/utils/tables/TopAgentsTable.tsx:1-13` (note the `totalSlaes` typo, carried to line 47):

```tsx
import { Box, Typography, Avatar, Divider } from "@mui/material";

function createData(name: string, totalSlaes: number) {
    return { name, totalSlaes };
}

const rows = [
    createData("Gilbert and Marjorie Monecillo", 10500000),
    createData("Angie Kay and Marc Godornes", 10123412),
    createData("Jessa Jill and Leo Ross Torralba", 9232413),
];

export default function TopAgentsTable() {   // zero props
```

Usage: `components/utils/DashboardLeaderboards.tsx:74` (`{showTable && <TopAgentsTable />}`), rendered into `DashboardLayout`'s right rail, which picks rail content by string-matching the current nav node name (`components/layouts/DashboardLayout.tsx:101-104`). The report pages that would host real tables are stubs (`Pages/SuperAdmin/Dashboard/Reports/Developer.tsx` renders a single `<Typography>`).

### 7.3 API calls — none exist

Verified absences: no `axios`/`fetch` import in `resources/js`; no `routes/api.php`; no controller returns JSON (`response()->json` appears only in `RoleMiddleware.php:21`); no `router.reload`/partial reloads; no data-fetching hook. **All data reaches the client as Inertia page props on GET navigation.**

The closest thing to a programmatic call is the app's one non-form write — logout:

```tsx
// resources/js/Pages/Admin/AdminDashboard.tsx:13
const handleLogout = () => router.post("/logout");
```
→ `routes/web.php:25` → `UserController::logout()` (`UserController.php:68-74`): `Auth::logout()`, `session()->invalidate()`, `redirect('/login')`. No loading/error handling at the call site.

---

## 8. Inconsistencies — two (or more) patterns for the same thing

### 8.1 Data entry: three form patterns for "collect fields and persist"

| Pattern | Where | Submits? |
|---|---|---|
| Inertia `<Form action method>` render-prop | `Pages/User/Auth/Login.tsx:77`, `Register.tsx:234`, `Verify.tsx` | Login yes; Register posts to `/register-attempt`, **a route that does not exist** |
| Inertia `useForm()` used only as state (`const { data, setData } = useForm(...)` — `post`/`errors` never touched) | `components/utils/forms/ClientForm.tsx:32`, `ProjectSaleForm.tsx:47` | Never — the Create Sale wizard's "Submit" button only increments the step (`components/layouts/CreateSaleStepperLayout.tsx:25-41`); no POST route exists for sales |
| `useState` + native inputs + `window.location.href` | `Pages/User/Auth/Stepper/CreateAccount.tsx`, `CreatePassword.tsx` | Never — CreateAccount `console.log`s the data and hard-navigates to `/createpassword` (line 180), a URL that doesn't exist (`/create-password` does); CreatePassword `alert()`s and never sends the password |

Even within the one wizard, adjacent steps use different stacks: `ClientForm`/`ProjectSaleForm` (`useForm`) vs `UploadPOTForm` (`useState`, `UploadPOTForm.tsx:26`), and each step's state is destroyed on unmount by the step `switch` (`components/utils/CreateProjectSaleStepperContent.tsx`) — nothing aggregates the wizard.

### 8.2 Everything else

1. **Error/loading handling, five styles:** render-prop `{processing, errors}` (`Login.tsx:78`); `processing` without `errors` so server errors vanish (`Register.tsx`); local `useState<string | null>` (`UploadPOTForm.tsx:28`); browser `alert()` (`CreatePassword.tsx:30`); silent `return` (`CreateAccount.tsx:176`). Plus the backend's raw JSON 403 from `RoleMiddleware.php:21` that Inertia can't render.
2. **Navigation, four ways:** Inertia `<Link>` (sidebar/breadcrumbs); `StyledButton LinkComponent={Link}` (`Pages/SuperAdmin/Dashboard/Index.tsx:127`); `router.post` (`AdminDashboard.tsx:13`); full-page `window.location.href` (`Register.tsx:238`, `CreateAccount.tsx:180`, `CreatePassword.tsx:32`) and a plain MUI link `href="/forgot-password"` (`Login.tsx:140`) — hard reloads that defeat the SPA.
3. **Auth user reaches the page twice, is read almost never:** globally shared `auth` (curated 4 keys, `AppServiceProvider.php:24-34`) *and* a per-page `'user' => Auth::user()` (full model, all non-hidden columns) passed by 7 controllers (`Portal/Admin/AdminDashboardController.php` + 6 SuperAdmin controllers), while 6 other render sites pass no user. On the client, the shared `auth` is read by nothing; `Accounting/index.tsx:19` renders `{user.name}` from the per-page prop while `Dashboard/Index.tsx:102` hardcodes `"Welcome to LR Portal, Philip 👋"`.
4. **Shared-props mechanism split:** the idiomatic `HandleInertiaRequests::share()` is empty scaffold while the legacy `Inertia::share` in `AppServiceProvider::boot()` does the real work.
5. **Route naming:** `superadmin.accounting` vs `superadmin.inbox.index` (same shape, two styles); and `superadmin.index` is registered **twice** — `routes/superadmin/superadmin-dashboard.php:9` (`/superadmin/dashboard/main`) and `routes/superadmin/superadmin-management.php:7` (`/superadmin/management`). The later registration wins, so `route('superadmin.index')` — used by the post-login redirect — resolves to the Management stub.
6. **Page filename case:** `Pages/SuperAdmin/Accounting/index.tsx` + `inertia('SuperAdmin/Accounting/index')` vs `Index.tsx`/`'.../Index'` everywhere else; the exact-string glob lookup in `app.tsx:8` means renaming either side alone silently breaks the page.
7. **Layout attachment, two syntaxes:** `Page.layout = (page) => <DashboardLayout children={page} />` (11 pages) vs `<AppLayout>{page}</AppLayout>` (4 pages, e.g. `Accounting/index.tsx:27`).
8. **Export style:** default exports (components, hooks, pages) vs named exports (helpers, `AppProvider`); `function X(){} ... export default X;` (layout-bearing pages) vs `export default function X()` (auth pages, all components).
9. **`use` prefix on non-hooks:** `useAppRoutes` / `useCreateSaleSteps` are plain arrays (`app-data.tsx:16,114`); `useHexToRGBA` is a pure function — beside real hooks `useBreadcrumbs`/`useSidebarRoutes`.
10. **Two TextField wrappers + bare `<TextField>`** (three ways to render an input): `StyledTextField` (pill/grey, custom props) vs `StyledTextFieldPrimary` (square, passthrough, dead) vs direct MUI `TextField` in `Stepper1-4.tsx`/`CreatePassword.tsx`.
11. **File extension noise:** `.tsx` for JSX-free modules (`app-data.tsx`, `helpers/truncateText.tsx`) next to `.ts` siblings; `interface User {name; email}` duplicated across 7 page files and colliding with the exported `User` in `components/utils/user/UserOnlineAvatar.tsx:12`; interface `ClientForm` (`types/app-data-types.ts:3`) collides with component `ClientForm.tsx`, forcing an import alias; `types/index.ts` ↔ `types/app-data-types.ts` import each other (circular, type-only).
12. **PHP class naming:** 11 controllers carry the `Controller` suffix; the 4 `Statistics/` classes don't. `CreateAccount()` PascalCase method vs camelCase everywhere else.

### 8.3 Broken references (dangling ends found while tracing; not exhaustive)

- **Build entry:** `vite.config.js:8` and `app.blade.php:5` both point at `resources/js/app.js`, which does not exist (never tracked in git); real entry is `app.tsx`. Runs under the dev server (`public/hot` present); `public/build/` has never been produced.
- `UserController.php:45` renders `'User/Auth/PasswordReset'` — `resources/js/Pages/User/Auth/PasswordReset.tsx` does not exist, so `GET /password-reset` fails at page resolution.
- Sidebar advertises `/superadmin/statistics` (`app-data.tsx:77-78`) — `routes/superadmin/superadmin-statistics.php` is empty and never required; no page dir exists; the 4 backing controllers are empty stubs.
- `Register.tsx:235` posts to `/register-attempt`; `Login.tsx:140` links `/forgot-password`; `CreateAccount.tsx:180` navigates to `/createpassword` — none of these routes exist.
- `Pages/Home/Index.tsx` and `components/cards/DashboardCard.tsx` are referenced by nothing (dead files).
- `User::role()` (`app/Models/User.php:54-57`) requires a `users.role_id` column that no migration creates.

---

## 9. Unclear — not derivable from the code

Flagged rather than guessed:

1. **`app/Models/` vs `app/Models/Entities/` split** — no comment, config, or doc explains it. Empirically: RBAC/auth models at the root, the one domain model (`Developer`, an empty stub) under `Entities/`. Whether future domain models (agents, teams, transactions — 15+ tables have migrations but no models) are meant for `Entities/` is unknown.
2. **Whether `npm run build` was ever intended to work** — the `app.js` entry has been wrong since the file was first committed, and no build manifest has ever existed. Intent unknown.
3. **Why three styling engines + Tailwind are installed but unused** — `styled-components`, `@mui/styled-engine-sc`, and the Tailwind toolchain may be leftovers of an abandoned direction or preparation for a future one; nothing in the repo (commit messages are `asdasd`, `migrate`, …) explains it.
4. **Roles `staff` and `secretary`** — seeded by `RoleSeeder` and assigned by `UserSeeder`, but no routes, middleware checks, or portals exist for them. (As noted in §5, users with these roles can't even complete login's redirect.)
5. **`POST /password-reset-verify`** (`web.php:19`, `UserController.php:48-51`) — accepts a request, ignores its body entirely, and redirects; no JS calls it. Its intended flow is unclear.
