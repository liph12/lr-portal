<?php

namespace App\Services\Legacy;

use App\Support\Areas;
use Illuminate\Support\Facades\DB;

/**
 * Legacy offices → offices (see docs/legacy-migration/offices.md). Idempotent: ids are kept and rows upserted.
 * offices.member_id is the secretary's members.id (= agents.id); 0 means no secretary. The area comes from the
 * office's province, else its branch name, by the same rules as an agent's.
 */
class LegacyOfficeImporter
{
    /**
     * @return array{stats: array<string, int>}
     */
    public function run(bool $dryRun = false): array
    {
        $stats = ['read' => 0, 'imported' => 0, 'with_secretary' => 0, 'secretary_not_found' => 0, 'no_area' => 0];
        $agents = array_fill_keys(DB::table('agents')->pluck('id')->all(), true);
        $clean = fn ($v) => ($v = trim((string) $v)) === '' ? null : $v;

        $rows = DB::connection('legacy')->table('offices')->orderBy('id')->get()->map(function ($o) use (&$stats, $agents, $clean) {
            $stats['read']++;
            $secretary = (int) $o->member_id > 0 ? (int) $o->member_id : null;
            if ($secretary && ! isset($agents[$secretary])) {
                $stats['secretary_not_found']++;
                $secretary = null;
            }
            $secretary && $stats['with_secretary']++;
            $area = Areas::forAgent($clean($o->prov_name), $clean($o->branch), null);
            $area ?? $stats['no_area']++;

            return [
                'id' => (int) $o->id,
                'name' => $clean($o->branch) ?? $clean($o->prov_name) ?? "Office {$o->id}",
                'province' => $clean($o->prov_name),
                'address' => $clean($o->address),
                'area' => $area,
                'email' => $clean($o->email),
                'mobile' => $clean($o->mobile),
                'telephone' => $clean($o->telephone),
                'secretary_agent_id' => $secretary,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        })->all();
        $stats['imported'] = count($rows);

        DB::beginTransaction();
        DB::table('offices')->upsert($rows, ['id'], ['name', 'province', 'address', 'area', 'email', 'mobile', 'telephone', 'secretary_agent_id', 'updated_at']);
        $dryRun ? DB::rollBack() : DB::commit();

        return ['stats' => $stats];
    }
}
