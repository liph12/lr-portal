---
title: People & reach
tags: [reach, teams]
---

# People & reach

Global Partners, Genealogy, office secretaries, My Team — who sees whom. Related: [[reports]] · [[management]] · back to [[README|index]].

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
- **My Team** (`/my-team`, `MyTeamController`, `TeamLeadershipService`): for whoever leads a team (`teams.agent_id`) or
  sub-team (`sub_teams.agent_id`) — leadership comes from the data, not the role; shared as `auth.leads` (drives the
  menu item + switcher). Overview = the report locked to their group (opens on last month); Members (server-paged —
  teams reach 12k members); Sub-teams. **My Team is view-only for every leader**: adding members, moving them between
  sub-teams and creating / editing sub-teams are Management's (superadmin / admin) — the old My Team write routes were removed. The Sub-teams page shows, for a date range (default last month), each sub-team's sales and its unit
  manager's own sales, ranked either way (`SalesReportService::totals`). A team leader can open any sub-team of their team (`?sub_team=`, read-only, `group.parent` set).
  Menus treat leaders as holding the pseudo-permission `_leader` (`helpers/permissions.ts`). Leaders
  can open their active members' `/agents/{agent}` profiles.
