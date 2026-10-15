---
title: Global search
tags: [search]
---

# Global search

Navbar search: pages, people, groups; sanctioned JSON endpoints. Related: [[people-and-reach]] · back to [[README|index]].

- **Global search** (navbar, `components/utils/search/GlobalSearch.tsx`): pages come from `app-data`
  routes via `helpers/searchPages.ts` (client-side); people come from `GET /search/users`
  (`Portal\SearchController`; rows show role + status read-only and open `/agents/{agent}` — back-office roles may open
  any profile, sales only with view_reports; superadmins get a "Sign in" button per row, `can_impersonate`; each person also carries `details` (team / sub-team + joined, registered,
  mobile, address, PRC / DHSUD expiry, Facebook link — `App\Support\SocialLinks::facebook` cleans legacy values, also on
  the profile — `AgentActivityService::windows` 6-month window) and `last_active_at` (users column; legacy
  `users.updated_at` via `legacy:import-last-activity` for now, activity logs later), shown by `PersonDetails` on expand; team leaders / unit managers also search, finding only the current members of the groups
  they lead — `TeamLeadershipService::ledMemberIds` — office secretaries the agents of their office's area (`SearchController::reach`, `UserPolicy::search`) — whose profiles they may open with sales), teams / sub-teams / areas from `GET /search/groups` (`GroupSearchService`, same reach as
  reports: back office → any group, opening `/reports/top-agents?team_id|sub_team_id|area=`; leaders → only groups they
  lead, opening My Team; `auth.can.search_groups`) — with `/search/agents`, `/genealogy/search` and `/search/users/{user}/certificates` (FIRE courses from realestatetraining.ph via
  `FireCertificateService`: `user.score`, max 3, course/date/score only, cached 1h, `services.fire_certificates.url`), the
  **only sanctioned JSON endpoints**, because typeahead can't be an
  Inertia visit. Don't add other JSON endpoints without the same reason. Who may do what is shared as
  `auth.can.{access_superadmin, search_users, manage_users}` — use these flags, not role names, in the UI.
