<?php

namespace App\Services\Legacy;

use Database\Seeders\ProjectPropertyTypeSeeder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * Reference data the sales point at, from the legacy copy being imported: property types (the fixed list), project developers
 * (legacy `developers` with isbroker = 0 — the brokerage ones become brokerage_areas in the sales import) and their `projects`.
 * Ids are kept and rows upserted, so it runs before the sales on a fresh database and refreshes names / new ones later.
 * linkSales() fills in what an earlier import couldn't link (sales imported while these tables were empty).
 */
class LegacyDeveloperImporter
{
    private const PROJECT_DEVELOPER = 0;

    /**
     * @return array{stats: array<string, int>}
     */
    public function run(bool $dryRun = false): array
    {
        $stats = ['property_types' => 0, 'developers' => 0, 'projects' => 0, 'projects_without_developer' => 0];
        $legacy = DB::connection('legacy');
        // Trimmed, and cut to the 255 characters the columns hold.
        $clean = fn ($v) => ($v = trim((string) $v)) === '' ? null : mb_substr($v, 0, 255);
        $coordinate = fn ($v) => is_numeric($v) ? (float) $v : null;

        DB::beginTransaction();
        try {
            if (DB::table('project_property_types')->doesntExist()) {
                // Seeders run unguarded; this one is called outside `db:seed`.
                Model::unguarded(fn () => (new ProjectPropertyTypeSeeder)->run());
            }
            $stats['property_types'] = DB::table('project_property_types')->count();
            $types = DB::table('project_property_types')->pluck('id')->flip();

            $developers = $legacy->table('developers')->where('isbroker', self::PROJECT_DEVELOPER)->orderBy('id')->get()
                ->map(fn ($d) => [
                    'id' => (int) $d->id,
                    'name' => $clean($d->name) ?? "Developer {$d->id}",
                    'email' => $clean($d->email),
                    'address' => $clean($d->street),
                    'profile_name' => $clean($d->developer_profile),
                    'latitude' => $coordinate($d->latitude),
                    'longitude' => $coordinate($d->longitude),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            foreach ($developers->chunk(500) as $chunk) {
                DB::table('developers')->upsert($chunk->all(), ['id'], ['name', 'email', 'address', 'profile_name', 'latitude', 'longitude', 'updated_at']);
            }
            $stats['developers'] = $developers->count();
            $known = $developers->pluck('id')->flip();

            $projects = $legacy->table('projects')->orderBy('id')->get()
                ->filter(function ($p) use ($known, &$stats) {
                    $ok = isset($known[(int) $p->devid]);
                    $ok || $stats['projects_without_developer']++;

                    return $ok;
                })
                ->map(fn ($p) => [
                    'id' => (int) $p->id,
                    'developer_id' => (int) $p->devid,
                    'name' => $clean($p->name) ?? "Project {$p->id}",
                    // Legacy rows use 0 or retired ids (5, 6) for "no type".
                    'project_property_type_id' => isset($types[(int) $p->prop_type_id]) ? (int) $p->prop_type_id : null,
                    'address' => $clean($p->location),
                    'latitude' => $coordinate($p->latitude) ?? 0,
                    'longitude' => $coordinate($p->longitude) ?? 0,
                    'status' => 'active',
                    // Kept only when it's whole JSON: the old system cut long logs off at 65,535 characters.
                    'update_logs' => is_string($p->logs) && json_validate($p->logs) ? $p->logs : null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            foreach ($projects->chunk(500) as $chunk) {
                DB::table('developer_projects')->upsert($chunk->all(), ['id'], ['developer_id', 'name', 'project_property_type_id', 'address', 'latitude', 'longitude', 'update_logs', 'updated_at']);
            }
            $stats['projects'] = $projects->count();

            $dryRun ? DB::rollBack() : DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        return ['stats' => $stats];
    }

    /**
     * Sales imported without their developer / project / property type (those tables were empty then): filled in from the
     * legacy sales report (`agent_transactions.id` = `salesreport.id`), only where still empty — nothing set since is changed.
     *
     * @return array{stats: array<string, int>}
     */
    public function linkSales(bool $dryRun = false): array
    {
        $stats = ['developer' => 0, 'project' => 0, 'property_type' => 0];
        $developers = DB::table('developers')->pluck('id')->flip();
        $projects = DB::table('developer_projects')->pluck('id')->flip();
        $types = DB::table('project_property_types')->pluck('id')->flip();
        $tables = ['agent_project_transactions', 'agent_rental_transactions', 'agent_brokerage_transactions'];

        DB::beginTransaction();
        try {
            foreach ($tables as $table) {
                $project = $table === 'agent_project_transactions';
                DB::table($table)
                    ->where(fn ($q) => $q->whereNull('project_property_type_id')->when($project, fn ($q) => $q->orWhereNull('developer_id')->orWhereNull('developer_project_id')))
                    ->select('id', 'agent_transaction_id', 'project_property_type_id', ...($project ? ['developer_id', 'developer_project_id'] : []))
                    ->chunkById(2000, function ($rows) use ($table, $project, $developers, $projects, $types, &$stats) {
                        $legacy = DB::connection('legacy')->table('salesreport')->whereIn('id', $rows->pluck('agent_transaction_id'))
                            ->get(['id', 'devid', 'projid', 'prop_type_id'])->keyBy('id');
                        foreach ($rows as $row) {
                            $s = $legacy[$row->agent_transaction_id] ?? null;
                            if (! $s) {
                                continue;
                            }
                            $set = [];
                            if ($row->project_property_type_id === null && isset($types[(int) $s->prop_type_id])) {
                                $set['project_property_type_id'] = (int) $s->prop_type_id;
                                $stats['property_type']++;
                            }
                            if ($project && $row->developer_id === null && isset($developers[(int) $s->devid])) {
                                $set['developer_id'] = (int) $s->devid;
                                $stats['developer']++;
                            }
                            if ($project && $row->developer_project_id === null && isset($projects[(int) $s->projid])) {
                                $set['developer_project_id'] = (int) $s->projid;
                                $stats['project']++;
                            }
                            $set && DB::table($table)->where('id', $row->id)->update($set);
                        }
                    });
            }
            $dryRun ? DB::rollBack() : DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        return ['stats' => $stats];
    }
}
