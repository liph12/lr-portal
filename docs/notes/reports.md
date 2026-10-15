---
title: Reports & statistics
tags: [reports, statistics]
---

# Reports & statistics

Sales report / Reports cards, report layout, areas (branches), Recruits, Recruits Progress, statistics charts, leaderboards. Related: [[natcon]] · [[people-and-reach]] · [[dashboard]] · back to [[README|index]].

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
- **Areas** (offices) — **shown to users as "Branch"** (columns, filters, headers, "Sales by Branch", "All branches"); code,
  routes and data keep `area` and counting is still by area (an area may hold several branch offices). `config/areas.php` (legacy LOCATIONS_LATEST + `abroad`) → `agents.area` via `App\Support\Areas`
  (state, then city: own area name > listed place > contains name > contains place; non-PH country → abroad).
  The `Agent` model re-derives it when state/city/country_code change; rows written with `DB::table` (imports)
  must set it themselves or run `php artisan agents:assign-areas`. Reports: `areas` view / "Sales by Area" card,
  drill by `area`. Agents with no area count in totals but are **never shown as an "Unassigned" area** in any
  statistic (By area, Sales by Area, Recruits Progress areas); Management › Agents and the profile still say "Unassigned".
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
