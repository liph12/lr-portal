---
title: NATCON
tags: [natcon]
---

# NATCON

NATCON boards, periods / cutoffs, reach, My NATCON sales. Related: [[reports]] · back to [[README|index]].

- **NATCON** (`/natcon`, permission `view_natcon` — superadmin, admin, staff, team_leader, unit_manager, agent (`000046`, `000048`);
  `Portal\NatconController`, `NatconService`; menu right after Reports): like Reports, `/natcon` is a card per board (with its
  count) and `/natcon/{slug}` the ranking (slugs = `NatconService::BOARDS` = `components/natcon/natconCatalog.ts`, the menu's
  children; `NatconPeriod` header on both) — six boards over one period: Qualifiers (agents whose valid local sales of
  every category reach the qualifier amount), Top Teams, Top Brokerage Sales (agents), Top Rent Managers (agents, rental),
  Top Brokerage Teams, Top Sub-Teams. A sale counts if it's **valid**, reserved in the period and **encoded**
  (`agent_transactions.created_at`) by the **edition's cutoff** (none yet = everything so far).
  **Top Rent Managers has its own period and cutoff date** (`rental_from` / `rental_to` / `rental_cutoff`, defaults
  2025-09-01 – 2026-08-31, encoded by the end of 2026-09-05 — a date, not a monthly cutoff); `NatconService::period($board)`
  decides per board (board `period => 'rental'`), sent to the pages as `period` / `boards[].period`. Each
  board is a `SalesReportService` breakdown with the filters `encoded_by` + `min_value` (not URL filters, so the drill-down
  pages show the plain period).
  **Editions** (`natcon_editions`, `NatconEdition`, migration `000061`): NATCON 2026, 2027… each with its own `from` / `to`, a
  **specific `cutoff_at`** (date + time; null = everything encoded so far counts), `qualifier_amount` (e.g. ₱43M / ₱47M) and Top Rent
  Managers' `rental_from` / `rental_to` / `rental_cutoff` (end of that day); one `is_default`. Routes: `/natcon`, `/natcon/my-sales`,
  `/natcon/{board}` = the default edition (menu links); `/natcon/{year}`, `/natcon/{year}/my-sales`, `/natcon/{year}/{board}` = any
  (unknown year → 404). **Menu**: one item per edition, newest first (`NATCON 2027`, `NATCON 2026` → `/natcon/{year}`, boards as children) — shared `auth.natcon_editions` (only with `view_natcon`), expanded from `natconRoute` by `withNatconEditions` in `usePortalRoutes`; the default's item also lights up on `/natcon` and `/natcon/{board}` (`PortalRoute.alsoActive`). With no edition the plain NATCON item stays. Pages get `settings` = the edition (`NatconService::edition`), `editions` (the `NatconEditionSwitcher`, shown
  when there are 2+) and `base` (`/natcon/{year}`, for links). Settings › NATCON (superadmin, `SuperAdmin\Settings\NatconController`):
  list, add (pre-filled from the latest a year later), edit (`SaveNatconEditionRequest`: year unique, period order, cutoff ≥ period end),
  make default, delete (`ManageNatconEditionRequest`: never the default). NATCON 2026 was made from the old `app_settings.natcon`
  (defaults 2025-08-01 – 2026-07-31, ₱43M, the July 2026 monthly cutoff's moment as its cutoff); that setting is no longer read.
  **Reach** (`NatconService::reach`): the back office (superadmin / admin / staff) every board of everyone; whoever leads a team /
  sub-team (from the data, `TeamLeadershipService::current` — a team first) **only Qualifiers**, locked to that group
(`team_id` / `sub_team_id`: sales made while on it); anyone else with an agent record only **My NATCON sales**
  (`/natcon/my-sales`, `NatconService::mineFilters`: their own valid sales in the main period, encoded by its cutoff, every
  category — the Qualifiers rule — shown by `AgentSalesView` with `fixedPeriod` + a qualifier progress bar; migration `000048`
  gave `view_natcon` to agent); no agent record → 403. Menu: `[BACKOFFICE, LEADER]` +
  `requires: view_natcon`, non-qualifier children `BACKOFFICE`. Amounts are shown to everyone with reach; rows open sales
  (`canOpen`) for leaders and readers with view_reports.
