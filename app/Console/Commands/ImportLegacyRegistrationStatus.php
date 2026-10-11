<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

// Backfills agent_attributes.registration_status from legacy members (agents.id = members.id) for agents imported
// before the column existed. New member imports set it directly. Safe to re-run.
class ImportLegacyRegistrationStatus extends Command
{
    protected $signature = 'legacy:import-registration-status {--dry-run : Show the counts without saving}';

    protected $description = 'Set agent_attributes.registration_status (registration stepper 1–4) from legacy members';

    public function handle(): int
    {
        $byStep = [];
        $updated = 0;

        DB::beginTransaction();

        DB::connection('legacy')->table('members')->select('id', 'registration_status')->orderBy('id')
            ->chunk(5000, function ($members) use (&$byStep, &$updated) {
                foreach ($members->groupBy(fn ($m) => (int) $m->registration_status ?: 0) as $step => $rows) {
                    $ids = $rows->pluck('id')->all();
                    $byStep[$step] = ($byStep[$step] ?? 0) + DB::table('agent_attributes')->whereIn('agent_id', $ids)->count();
                    $updated += DB::table('agent_attributes')->whereIn('agent_id', $ids)
                        ->where(fn ($q) => $q->whereNull('registration_status')->orWhere('registration_status', '!=', $step ?: null))
                        ->update(['registration_status' => $step ?: null]);
                }
            });

        $this->option('dry-run') ? DB::rollBack() : DB::commit();

        ksort($byStep);
        $this->table(['Registration step', 'Agents'], collect($byStep)->map(fn ($n, $step) => [$step ?: 'none', number_format($n)])->values());
        $this->info(($this->option('dry-run') ? '[DRY RUN] ' : '').number_format($updated).' agents '.($this->option('dry-run') ? 'would change.' : 'updated.'));

        return self::SUCCESS;
    }
}
