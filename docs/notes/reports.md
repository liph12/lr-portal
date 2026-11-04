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
- **Only active teams are ranked**: a team or sub-team that is paused (`inactive`) or closed (`deactivated`) — or a sub-team of
  such a team — gets no row in any team / sub-team ranking or grouping: `SalesReportService::grouped()` (Reports Top Teams / Top
  Sub-teams, View Sales, Overview, NATCON team boards, My Team sub-team totals), `LeaderboardService` top teams, Global Partners'
  top teams, Recruits Progress' team / sub-team groupings. Their sales still count in every total and for their agents.
- **Report layout**: the ranked table comes first (name, Area / location, Team where relevant, Total sales — no
  count / average / share columns); statistics (`components/reports/ReportStatistics.tsx`: tiles, trend, by
  category, by area, by client country — codes and legacy names merged via `Countries::resolve`, top 10 + Other —
  by client gender, by client age, by property type, and Top developers (known developers only — no "Unknown developer" row; same on the leaderboards) with % share of project sales when the report includes
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
- **Recruits KPI** (Reports › Recruits KPI `/reports/recruits-kpi`, `ReportsController::recruitsKpi`, page `Portal/Reports/RecruitsKpi`;
  permission `report_recruits_kpi`, migration `000062` → every role with Recruits Progress; only readers whose reach is a group —
  back office, leaders, office secretaries (`groupReach`), never a plain agent; menu `REPORT_ACCESS` `[BACKOFFICE, LEADER, SECRETARY]`):
  Teams | Sub-teams (inside a team: its sub-teams; inside one sub-team nothing to compare). `RecruitProgressService::kpi` = every
  group in reach, not paged — the Recruits Progress grouping (`groupRows`) plus groups with sales but no new recruits — with new
  recruits, sold %, NAO / FIRE %, new recruits' sales, the group's total sales (`groupSales`, within the reader's reach) and the KPI
  `share` = new recruits' sales ÷ total. The page totals the shown rows into tiles, sorts / searches in the browser, and its
  **Columns** button (every `DataTable` has it now; this page keeps the key `lr-recruits-kpi-columns`); a row opens that group in Recruits Progress.
- **Recruits** (Reports › Recruits `/reports/recruits`, and My Team › Recruits; `RecruitmentService`): **only the sign-up range** (no
  all-time member count) — new recruits signed up in the date range (`agents.created_at`), and onboarding of recruits **without any sale** (local or
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
  **Two different sales figures, side by side** (KPI): "New recruits' total sales" = what the recruits who signed up in the range
  sold (any date) — and **"Total sales"** = all members' valid sales reserved in the range, old members' too, exactly Top Teams'
  figure (`RecruitProgressService::groupSales` → `SalesReportService::totals` per team / sub-team / branch row as `total_sales`;
  `totalSales` → the summary's `kpis.total_sales` for the selection: team / sub-team / branch / everyone, null for one sponsor).
  KPIs are `RecruitsPanel` (ordinary stat tiles + FIRE / NAO / Overall cards: not started · on progress · finished,
  for recruits without a sale — the legacy numbers, in this app's style). Groupings: team, unit manager, location
  (area), sponsor. Rows drill down by `team_id` / `sub_team_id` / `area` / `sponsor_id` (merged with the reader's
  reach, which wins) and show the large `ReportScopeHeader`; "View these recruits" opens Reports › Recruits with the
  same selection. The summary is
  one area × month pass, summed in PHP (each pass over ~20k recruits is ~0.5s).
  **Download PDF** (button beside the date range): a partial reload of the optional prop `pdfRows` (every row of the tab being
  viewed, table order, at most `ReportsController::PDF_ROWS` = 500, `{data, total}`), then `components/recruitment/RecruitsProgressPdf`
  draws A4 landscape pages off-screen — summary tiles + NAO / FIRE / Overall `ShareBar`s, then top branches + sign-ups and sales per
  month (`MonthlyColumnChart metric=` pins one measure, no toggle), then the table 13 rows a page, numbered — and
  `helpers/exportPdf.ts` `pagesToPdf` captures each `.lr-pdf-page` as a picture (`html-to-image` → `jspdf`, both MIT, loaded on
  the first click). Printouts are always light at the normal text size: `.lr-print` shares the light token blocks in `app.css`.
  Reuse the same pieces for another report's PDF.
  **AI analysis** (inside one team or sub-team — selected, or a leader's lock; `analysisFor` = `RecruitAnalysisService::groupOf`, else
  null; permission `report_recruits_ai_analysis`, migration `000063` → every role with Recruits Progress): "Analyze this team" asks for
  the optional prop `analysis` (`RecruitAnalysisService::analyze`, page component `components/recruitment/RecruitsAnalysis`). The
  **facts are computed exactly** in PHP: old vs new agents' contribution in the range (new = the selection's recruits,
  `RecruitProgressService::recruitIds`; `SalesReportService::split` = sales per month with the part sold by a set of agents + sellers
  each side; share, productivity = sellers ÷ members, per seller), 12 whole months (old / new stacked), a 3-month forecast (half the
  12-month straight line, half the last-6 average, ± one residual SD) and the target that doubles sales (2 × the last 3 months'
  average). **OpenAI** (`OpenAiClient`, `services.openai` = `OPENAI_API_KEY` + `OPENAI_MODEL`, default `gpt-5.4-mini`, chat completions
  with a strict JSON schema) only writes from those totals — summary + highlights, contribution, NAO / FIRE, an outlook per forecast
  month, 10 strategies (owner, KPI, impact). No names are sent (not even the group's). Cached a day per set of facts; 20 uncached calls
  per reader an hour; no key / a failure → the numbers with a warning. A request may run ~10–40 s (`set_time_limit(150)`).
  **Kept lean**: the facts come from one pass over the group's sales (`SalesReportService::byMonthAndAgent`: month × agent × in-range
  flag, for the range and the 12 trend months together) split old / new in PHP against `recruitIds` (a lean id query) — ~0.2 s, cached
  (`RecruitAnalysisService.facts`). The model gets `brief()`: ₱ in millions to one decimal, series as rows, field meanings and all
  instructions in the system message / schema descriptions (a fixed prefix OpenAI can cache), word limits per field;
  `reasoning_effort` `OPENAI_REASONING` (default `none` — the numbers are already worked out), `verbosity: low`,
  `max_completion_tokens` 2500. Each call's tokens are logged (`OpenAI team_analysis` in the log). Measured on a 12k-member team:
  facts 2.9 s → 0.18 s; prompt 1,743 → ~1,140 tokens, answer 1,603 → ~1,020, reasoning 30 → 0.
  **Precision**: the model never calculates — `derived()` hands it the comparisons (trend vs the 3 months before, forecast vs
  baseline, gap to target per month, productivity gap in pp and ratio, value-per-seller ratio, new agents' share first / last 3
  months, extra sellers needed) and `brief()` the NAO / FIRE shares; it once wrote "₱487B" and "65.7% in progress" (really 3.4%)
  doing its own arithmetic. Facts also carry `capacity` (sellers a month and value per seller over the last 3 months → sellers a
  month the target needs), shown above the chart. The system prompt sets the house style: figures on every claim (3 significant
  digits, %, pp, ×, "Oct 2026"), formal third person naming the group as `group` says, verb-first actions with who / when, KPIs
  "metric: current → target by Mon YYYY" with numbers on both sides. Strategies are re-sorted high → low impact on the server.
  The outlook is matched to the forecast by order. Prompt ~1,700 tokens, answer ~1,350.
  **Wording**: "sales" for the amount ("₱X in sales") and the count ("N sales"); never booked / generated / produced / delivered /
  revenue / output…; agents "made a sale". `wording()` is the guard on every answer, fresh or cached: "made / delivered … ₱X" →
  "had sales of ₱X", "output" → "sales", a stray subscript digit ("₄89M") → "₱489M". The answer cache key carries
  `PROMPT_VERSION` — raise it with any prompt change.
  **Send report** (permission `send_recruits_ai_report`, migration `000064`, given to no role — the superadmin sends; deliberately not
  `report_*`, which helpers grant wholesale): `POST /reports/recruits-progress/analysis/send` (`SendRecruitAnalysisRequest`,
  throttled; `ReportsController::sendRecruitAnalysis` → `RecruitAnalysisService::send`) emails the analysis on the page (cached, else
  written first) to the chosen `audience` (`AUDIENCES`): **superadmins** = every active superadmin with an email, not the leader (the
  email says "Superadmins only", subject "(superadmins only)"); **all** = the group's leader — `recipient()`: the team's leader or the
  sub-team's unit manager, account email else agent email; none → an error toast, superadmins-only still works — with every superadmin
  cc'd. Sent at once (not queued) so failures show. `Mail\RecruitAnalysisReport`,
  view `mail/recruit-analysis` (inline-styled HTML with the brand's hex values, since mail clients ignore CSS variables): the whole
  analysis in the body — summary, contribution table + share bar, the 3 months, NAO & FIRE, the 10 strategies, "Open in Recruits
  Progress". Logged `report.analysis_sent` (with the audience). The page gets `analysisAudience` (`{leader, superadmins}`) and "Send
  report" opens a dialog to pick the audience (superadmins only by default; "all" disabled without a leader email); the post asks back `only: ['flash']`, so the analysis stays on screen.
  Once generated, **Download PDF** includes it: three pages after the charts (summary + contribution + NAO / FIRE, the next 3 months,
  the 10 strategies) — the same component with `print` + `parts` (fixed columns, no buttons); each PDF page's body is scaled down
  to fit (`Fit` in `RecruitsProgressPdf`, the largest scale whose layout fits) since the AI's text varies in length.
- **Charts / statistics**: `/{superadmin,admin,staff}/statistics`, guarded by its own `view_statistics` permission (Settings ›
  Roles & permissions › Statistics; migration `000028` gave it to every role that had view_reports) (`StatisticsController` → `StatisticsService`,
  sales dated by `reservation_date`). Client splits (country, gender, age) for both pages come from `App\Support\ClientStats`; ages
  outside 18–99 are typos and only counted as `excluded` (`agent_transaction_details.client_age`: legacy `clientAge` via
  `legacy:import-client-ages`, new sales from the birthdate at the reservation date in `SaleRecord`); UI `ClientAgeChart`. Charts are plain MUI in `components/charts/` (`StatTile` — optional `icon`: a large faint watermark in the corner; money on a tile is the whole amount to the centavo, `formatPesoExact`, never `formatPesoCompact`; the figure never wraps: it sizes itself to the card with `helpers/fitText.ts` `fitFontSize` (the card is an inline-size container; also `SalesTotals`);
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
