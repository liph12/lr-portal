# Legacy migration — sales teams → `teams`, `sub_teams` and their members

Source: `lr_legacy.sales_team` (89), `sales_team_members` (59,015), `salesteam_subteam` (507),
`salesteam_subteam_members` (44,320). Run with `php artisan legacy:import-teams` (`--dry-run`)
**after** `legacy:import-members`. Imported 11 Oct 2026.

| New table | Rows |
|---|---|
| `teams` | 76 (49 active, 21 resigned, 6 inactive) |
| `team_agents` | 58,087 (54,418 active) |
| `sub_teams` | 501 |
| `sub_team_agents` | 43,786 (38,708 active) |

## Ids and links

- `teams.id` = `sales_team.id`, `sub_teams.id` = `salesteam_subteam.sid`,
  `sub_teams.team_id` = `tteamID`.
- Every agent reference is the legacy **`members.id`** (`memid`, `memID`, `LeadID`), which is
  `agents.id`. The legacy `agentid` columns hold the old `members.memberid` and are ignored.
- 718 membership rows point to members that weren't imported (left out).

## Leaders (`agent_id`)

- **Team:** the member with `isleader = 1` who is still on the team (`activeTeam = 1` and a
  `dateresigned` not yet passed), newest `datejoined` first. 17 teams have no current leader and
  keep their most recent past leader.
- **Sub-team:** `LeadID` (if that agent wasn't imported, its newest `isLeader` member).
- `agent_id` is required, so teams that never had an imported leader are **skipped**: 13 teams
  (11 resigned, `LR Tech Squad` active and `FH Solid North` inactive, 87 membership rows in total)
  and 6 sub-teams (4 with an unknown `LeadID`, 2 under skipped teams). The command lists them.

## Membership status

Legacy `dateresigned` was usually set in advance (e.g. 2032-12-31), and agents were transferred by
adding a new row rather than closing the old one, so the same agent can appear on several teams
at once. Per agent and per table:

1. Rows ordered by join date (`datejoined`; sub-teams have none, so `created_at`). The same
   agent + team + join date repeated is one membership (500 duplicates merged).
2. Only the **newest** row can be `active`, and only if `activeTeam = 1` (team rows),
   `dateresigned` hasn't passed, and the team/sub-team itself is `active`.
3. Every other row is `inactive`, with `transferred_at` = the next membership's join date, or the
   past `dateresigned` when there is no later membership.

`joined_at` = the join date. Team `status` is the legacy value (active / resigned / inactive);
sub-team status is active or inactive (one junk value becomes inactive). `logo` keeps only URLs.
