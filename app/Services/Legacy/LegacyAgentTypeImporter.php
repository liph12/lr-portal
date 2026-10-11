<?php

namespace App\Services\Legacy;

use App\Models\Entities\Agent;
use Illuminate\Support\Facades\DB;
use Throwable;

// Backfills agents.country, country_code and agent_type from legacy members (agents.id = members.id) and
// keeps the Global Partner role in step: plain agents who are global partners get it, and global partners
// who no longer qualify go back to Agent. Other roles are never touched. Safe to re-run.
class LegacyAgentTypeImporter
{
    private const CHUNK = 1000;

    /**
     * @return array<string, int>
     */
    public function run(bool $dryRun = false): array
    {
        $stats = ['global_partner' => 0, 'local' => 0, 'with_country_code' => 0, 'agents_updated' => 0, 'roles_to_global_partner' => 0, 'roles_to_agent' => 0];
        $rows = [];

        DB::connection('legacy')->table('members')->select(['id', ...LegacyAgentOrigin::COLUMNS])->orderBy('id')
            ->chunk(5000, function ($members) use (&$rows) {
                foreach ($members as $m) {
                    $rows[(int) $m->id] = LegacyAgentOrigin::of($m);
                }
            });

        DB::beginTransaction();

        try {
            foreach (array_chunk(array_keys($rows), self::CHUNK) as $ids) {
                $current = DB::table('agents')->whereIn('id', $ids)->get(['id', 'country', 'country_code', 'agent_type'])->keyBy('id');

                foreach ($current as $id => $agent) {
                    $origin = $rows[$id];
                    $stats[$origin['agent_type']]++;
                    $stats['with_country_code'] += $origin['country_code'] ? 1 : 0;

                    if ($agent->country !== $origin['country'] || $agent->country_code !== $origin['country_code'] || $agent->agent_type !== $origin['agent_type']) {
                        DB::table('agents')->where('id', $id)->update($origin);
                        $stats['agents_updated']++;
                    }
                }
            }

            [$stats['roles_to_global_partner'], $stats['roles_to_agent']] = $this->syncRoles();

            $dryRun ? DB::rollBack() : DB::commit();
        } catch (Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        return $stats;
    }

    /**
     * @return array{0: int, 1: int}
     */
    private function syncRoles(): array
    {
        $agent = DB::table('roles')->where('name', 'agent')->value('id');
        $globalPartner = DB::table('roles')->where('name', 'global_partner')->value('id');

        if (! $agent || ! $globalPartner) {
            return [0, 0];
        }

        $usersOf = fn (string $type) => DB::table('agents')->where('agent_type', $type)->select('user_id');

        return [
            DB::table('role_user')->where('role_id', $agent)->whereIn('user_id', $usersOf(Agent::TYPE_GLOBAL_PARTNER))->update(['role_id' => $globalPartner]),
            DB::table('role_user')->where('role_id', $globalPartner)->whereIn('user_id', $usersOf(Agent::TYPE_LOCAL))->update(['role_id' => $agent]),
        ];
    }
}
