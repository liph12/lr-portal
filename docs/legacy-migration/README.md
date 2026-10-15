# Legacy migration — runbook for developers

The old system's database (`lr_legacy`, ~1.2 GB) becomes this portal's data in three commands. The same steps show on
**Settings › Legacy migration** (`/superadmin/settings/legacy-migration`, superadmin), with the last run, each step's
output and a "Run the import" button.

Never copied — nothing imports them, and they are ~800 MB of the dump: `activity_tracker`, `inbox_improved`,
`personal_access_tokens` (tokens are rewritten at every sign-in / sign-out anyway). The list is `config/legacy.php`
`excluded_tables` (env `LEGACY_EXCLUDED_TABLES`).

## Try it locally first

```
php artisan legacy:rehearse
```
Runs deploy day for real on your machine, in throwaway databases: dumps your `lr_legacy`, restores it into
`lr_legacy_rehearsal`, builds `lr_portal_rehearsal` with `legacy:migrate --fresh`, then prints each phase's time and the row
counts next to your own database (a few rows' difference = records you made while developing). Your databases are only read;
the rehearsal ones are dropped at the end (`--keep` to look around in them, `--dump=<file>` to rehearse with a dump from the
old server). About 1½ minutes. Run it before a deploy, and after adding a migration or an importer.

## Deploy day

1. **Dump the old database** — on a machine that can reach it, with `LEGACY_DB_*` in `.env` pointing at it:
   ```
   php artisan legacy:dump
   ```
   Writes `storage/app/private/legacy/lr_legacy-<date>.sql.gz` without the excluded tables (~80 MB instead of 1.2 GB;
   `--single-transaction`, so the live site isn't locked). A dump made another way (phpMyAdmin, cPanel) works too.
2. **Load it on the new server** — `LEGACY_DB_*` = an empty database there:
   ```
   php artisan legacy:restore storage/app/private/legacy/lr_legacy-<date>.sql.gz
   ```
   Recreates that database and streams the dump in, dropping every statement about an excluded table if the dump has them.
3. **Build the portal database and import**:
   ```
   php artisan legacy:migrate --fresh --force
   ```
   `migrate:fresh --seed` (roles, permissions, the team's accounts, developers, projects), then every step of
   `config/legacy.php` `steps` in order. Each step is recorded; a failed one stops the run.

## Afterwards

- **Schema changed, or a newer legacy copy**: `php artisan legacy:migrate` — applies new migrations, then re-runs the imports.
  They **add what's new** (new members, sales, teams…) and leave records already imported as they are — a sale whose status
  changed in the old system keeps its imported status — except documents, offices and cutoffs, which are refreshed. Nothing is
  duplicated or erased. Or the button on the page.
- **Everything as in the newest legacy copy**: `php artisan legacy:migrate --fresh` rebuilds the portal database from it — and
  erases what exists only in the portal (records made here: NAO approvals, SMS, posters, test sales…). Back the database up first.

### A newer legacy copy (.sql / .sql.gz)

```
php artisan legacy:rehearse --dump=/path/to/lr_legacy.sql     # optional: try it in throwaway databases first
php artisan legacy:restore /path/to/lr_legacy.sql             # replaces lr_legacy with it (excluded tables left out)
php artisan legacy:migrate                                    # add what's new to lr_portal …
php artisan legacy:migrate --fresh                            # … or rebuild lr_portal from it entirely
```
- **A step failed**: fix it, then `php artisan legacy:migrate --from=<that step>` (the page offers "Resume from the failed step").
- **One step only**: `php artisan legacy:migrate --only=legacy:import-sales`.
- **A new importer**: add its command to `config/legacy.php` `steps` where it belongs in the order — `LegacyMigrationTest`
  fails until every `legacy:*` command is a step or listed in `not_in_migration`. Mapping notes per table stay in this folder.

Both `legacy:restore` and `legacy:migrate` end with `ANALYZE TABLE` on every table (`LegacyMigration::analyze`): a bulk import
leaves MySQL's statistics stale and it picks plans hundreds of times slower — after the first `--fresh` the leaderboards took
39 s instead of 0.1 s and pages hit PHP's 30 s limit. If an import was stopped before the end, refresh them by hand:
`php artisan tinker --execute='app(App\Services\Legacy\LegacyMigration::class)->analyze();'`

Developers and projects are **imported from the legacy copy** (`legacy:import-developers`, before the sales: the sales import only
links a sale to a developer / project / property type that already exists), not seeded — the old `DeveloperSeeder` / `ProjectSeeder`
snapshots miss newer ones and never ran on `--fresh`, which once left every sale without its developer. `legacy:import-sale-links`
(after the sales) fills in any sale still missing them from `salesreport`; `legacy:rehearse` compares those links too.

`--fresh` refuses to run in production without `--force`, and never runs from the page.
