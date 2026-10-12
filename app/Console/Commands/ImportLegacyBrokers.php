<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

// Broker stops being a role: agents.is_broker from legacy members.membertype = 'broker' (members.id = agents.id), and
// everyone still holding the old Broker role moves to their real role — team leader if they lead a team, unit manager
// if they lead a sub-team, else agent — after which the role is deleted. Safe to re-run; never clears a broker flag.
class ImportLegacyBrokers extends Command
{
    protected $signature = 'legacy:import-brokers {--dry-run : Count without saving}';

    protected $description = 'Mark brokers on agents (legacy membertype) and retire the Broker role';

    public function handle(): int
    {
        $legacy = DB::connection('legacy')->table('members')->whereRaw("LOWER(TRIM(membertype)) = 'broker'")->pluck('id')->map(fn ($id) => (int) $id)->all();

        DB::beginTransaction();
        $flagged = 0;
        foreach (array_chunk($legacy, 1000) as $ids) {
            $flagged += DB::table('agents')->whereIn('id', $ids)->where('is_broker', false)->update(['is_broker' => true]);
        }

        $role = DB::table('roles')->where('name', 'broker')->first();
        $moved = ['team_leader' => 0, 'unit_manager' => 0, 'agent' => 0];
        if ($role) {
            $roles = DB::table('roles')->whereIn('name', array_keys($moved))->pluck('id', 'name');
            foreach (DB::table('role_user')->where('role_id', $role->id)->pluck('user_id') as $userId) {
                $agentId = DB::table('agents')->where('user_id', $userId)->value('id');
                $name = match (true) {
                    $agentId && DB::table('teams')->where('agent_id', $agentId)->exists() => 'team_leader',
                    $agentId && DB::table('sub_teams')->where('agent_id', $agentId)->exists() => 'unit_manager',
                    default => 'agent',
                };
                // One role per user: the Broker row is replaced, not added to.
                DB::table('role_user')->where('user_id', $userId)->delete();
                DB::table('role_user')->insert(['user_id' => $userId, 'role_id' => $roles[$name]]);
                if ($agentId) {
                    DB::table('agents')->where('id', $agentId)->update(['is_broker' => true]);
                }
                $moved[$name]++;
            }
            DB::table('permission_role')->where('role_id', $role->id)->delete();
            DB::table('roles')->where('id', $role->id)->delete();
        }
        $this->option('dry-run') ? DB::rollBack() : DB::commit();

        $prefix = $this->option('dry-run') ? '[DRY RUN] ' : '';
        $this->info($prefix.number_format(count($legacy)).' legacy brokers; '.number_format($flagged).' agents newly marked as broker.');
        $this->info($prefix.($role ? 'Broker role retired; its users moved to team leader '.$moved['team_leader'].', unit manager '.$moved['unit_manager'].', agent '.$moved['agent'].'.' : 'No Broker role left.'));

        return self::SUCCESS;
    }
}
