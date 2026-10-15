---
title: Legacy data
tags: [legacy, import]
---

# Legacy data

Imports from lr_legacy: members, sales, teams, ids, registration status, fill-existing. Related: [[sales-recording]] · back to [[README|index]].

- **Legacy data**: the old system is restored locally as database `lr_legacy` (connection `legacy`,
  read-only use). Imports are artisan commands backed by services in `app/Services/Legacy/`
  (`legacy:import-members`; legacy SUPERVISOR = `team_leader`, there is no supervisor role; **Broker is not a role** —
  `agents.is_broker`, from legacy `members.membertype = 'broker'` whatever the account's role, `legacy:import-brokers` backfills
  it and retired the old Broker role (its holders → team leader / unit manager by leadership, else agent)): idempotent by email, `--dry-run` rolls back, rejects go to
  `storage/app/private/legacy-import/`. Accounts that already existed in the portal (the seeded team) keep their account and get
  only the legacy id — `legacy:fill-existing-accounts` (`--dry-run`) then fills in what they lack from their own member (agent_attributes,
  credentials / profile if missing, empty agent fields; never overwrites). Mapping and decisions: `docs/legacy-migration/`.
  `agents.agent_type` is `Agent::TYPES` (local, global_partner): global = legacy `national_intern` international
  + joined ≥ 2024-02-01 + country not PH (`Agent::typeFromLegacy`, `LegacyAgentOrigin`, `legacy:import-agent-types`
  re-applies it and syncs the `global_partner` role). `agents.lr_joined_at` = joined Leuterio Realty (legacy
  `members.lr_joined`, `legacy:import-lr-joined`; "0000-00-00" = none): the search's "Registered", the profile's "Joined
  Leuterio Realty" and the global-partner cut-off (else `created_at`). `agents.country` / `country_code` via `App\Support\Countries` (no country
  recorded → Philippines / `PH`: `Agent::saving`, `LegacyAgentOrigin`, migration `000027`; agent type is decided first)
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

Mapping and decisions per table: `docs/legacy-migration/` (members, sales, teams, offices, documents, international-sales).
