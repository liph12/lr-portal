<?php

namespace App\Console\Commands;

use App\Services\Legacy\LegacyMemberImporter;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

// agents.lr_joined_at from legacy members.lr_joined (agents.id = members.id); "0000-00-00" means none. Safe to re-run.
class ImportLegacyLrJoined extends Command
{
    protected $signature = 'legacy:import-lr-joined {--dry-run : Count without saving}';

    protected $description = 'Set agents.lr_joined_at (joined Leuterio Realty) from legacy members.lr_joined';

    public function handle(): int
    {
        $updated = 0;
        DB::beginTransaction();

        DB::connection('legacy')->table('members')->whereNotNull('lr_joined')->select('id', 'lr_joined')->orderBy('id')
            ->chunkById(5000, function ($rows) use (&$updated) {
                foreach ($rows->groupBy(fn ($r) => LegacyMemberImporter::lrJoined($r->lr_joined) ?? '') as $date => $group) {
                    if ($date === '') {
                        continue;
                    }
                    $updated += DB::table('agents')->whereIn('id', $group->pluck('id'))
                        ->where(fn ($q) => $q->whereNull('lr_joined_at')->orWhere('lr_joined_at', '!=', $date))
                        ->update(['lr_joined_at' => $date]);
                }
            });

        $this->option('dry-run') ? DB::rollBack() : DB::commit();
        $this->info(($this->option('dry-run') ? '[DRY RUN] ' : '').number_format($updated).' agents updated.');

        return self::SUCCESS;
    }
}
