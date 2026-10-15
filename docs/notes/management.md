---
title: Management
tags: [management]
---

# Management

Management cards / tabs, agents & teams, transfers, designations, editing profile & upline, agent activity, documentation. Related: [[sms]] · [[sales-recording]] · back to [[README|index]].

- **Management** (`/{superadmin,admin,staff}/management`, same pages in
  `Pages/Portal/Management/`, routes from `routes/management.php` called per portal, guarded by
  `can:manage,Team` = `TeamPolicy::manage` → **any of the five Management permissions**, so ticking one for a role opens it).
  **`/management` is a card page** (`Pages/Portal/Management/Index`, `can:open,Team` = Management permissions **or** a receiving
  permission; `TeamDirectoryService::overview` counts): one card per section from `components/management/managementCatalog.ts`
  (also the `ManagementLayout` tabs — Overview first — and the menu node's children): Agents, Teams, Sub-teams, Team transfers,
  **Brokerage receiving, Rental receiving, SMS Manager** (their pages keep their URLs and permissions but render inside `ManagementLayout`;
  they're no longer sidebar items — the Management item carries their awaiting badge / waiting credit requests). Agents ( by default only agents **on a team** and **fully registered**: filters `membership=no_team|any`,
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
- **Documentation** (`/{superadmin,admin,staff}/documentation`, routes from `routes/documentation.php` called per portal,
  `can:manage,AgentDocument` = permission `manage_documents`; `Portal\DocumentationController`, `AgentDocumentService`):
  agents' requirement documents in `agent_documents` (type `AgentDocument::TYPES`, status `AgentDocument::STATUSES`,
  `is_current` = the latest of its type per agent — keep exactly one) + reviewers' `agent_document_comments`. Server-paged
  table (latest only by default), status tabs from the `counts` prop, review drawer opened by `?document=` (partial reload of
  `document`). Sending back (`for_reupload`) requires remarks. Legacy: `legacy:import-documents`, see
  `docs/legacy-migration/documents.md`.
