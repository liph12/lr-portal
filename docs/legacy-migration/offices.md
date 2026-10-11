# Offices (legacy `offices` → `offices`)

`php artisan legacy:import-offices [--dry-run]` (`LegacyOfficeImporter`). Idempotent: ids kept, rows upserted.

| Legacy | New | Notes |
|---|---|---|
| `id` | `id` | |
| `branch` (else `prov_name`) | `name` | |
| `prov_name` | `province` | |
| `prov_name`, then `branch` | `area` | `Areas::forAgent(province, branch)` — same rules as agents (Butuan → Cagayan, General Santos → Gensan). |
| `member_id` | `secretary_agent_id` | The secretary's `members.id` (= `agents.id`); 0 = no secretary. |
| `address`, `email`, `mobile`, `telephone` | same | Office contact details. |

Not imported: `secretary` (a name; the agent link is enough), `img_template`, `gdrive_link`, `prov_id`.
`secretaries` / `secretaries_info` (assign_states / assign_cities) aren't used: the office is the assignment.

Run on 2026-10-11: 19 offices in 10 areas, 17 with a secretary (16 with the secretary role, Cebu's is an admin);
Camarines Sur and Cavite (both Metro Manila) have none.
