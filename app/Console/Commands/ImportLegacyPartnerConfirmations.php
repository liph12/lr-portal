<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

// Legacy members.sponsor_activation_status = 'confirmed' → agents.sponsor_confirmed_at (agents.id = members.id). Legacy
// kept no confirmation date, so it takes the activation date, else the sign-up date. Only fills blanks: confirmations
// made in the portal are kept. Safe to re-run.
class ImportLegacyPartnerConfirmations extends Command
{
    protected $signature = 'legacy:import-partner-confirmations {--dry-run : Count without saving}';

    protected $description = 'Copy legacy sponsor_activation_status (global partner confirmation) into agents.sponsor_confirmed_at';

    public function handle(): int
    {
        $updated = 0;
        DB::beginTransaction();

        DB::connection('legacy')->table('members')->where('sponsor_activation_status', 'confirmed')->select('id')->orderBy('id')
            ->chunkById(2000, function ($rows) use (&$updated) {
                $updated += DB::table('agents')->whereIn('id', $rows->pluck('id'))->whereNull('sponsor_confirmed_at')
                    ->update(['sponsor_confirmed_at' => DB::raw('COALESCE(activated_at, created_at, CURRENT_TIMESTAMP)')]);
            });

        $this->option('dry-run') ? DB::rollBack() : DB::commit();
        $this->info(($this->option('dry-run') ? '[DRY RUN] ' : '').number_format($updated).' agents marked confirmed.');

        return self::SUCCESS;
    }
}
