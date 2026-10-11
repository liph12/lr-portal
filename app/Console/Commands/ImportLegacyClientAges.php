<?php

namespace App\Console\Commands;

use App\Services\Legacy\LegacySalesImporter;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

// Backfills agent_transaction_details.client_age from legacy salesreport.clientAge for sales imported before the
// column existed (agent_transactions.id = salesreport.id). Safe to re-run.
class ImportLegacyClientAges extends Command
{
    protected $signature = 'legacy:import-client-ages {--dry-run : Count without saving}';

    protected $description = 'Copy legacy salesreport.clientAge into agent_transaction_details.client_age';

    public function handle(): int
    {
        $updated = 0;
        $read = 0;

        DB::beginTransaction();

        DB::connection('legacy')->table('salesreport')->whereNotNull('clientAge')->where('clientAge', '!=', 0)
            ->select('id', 'clientAge')->orderBy('id')
            ->chunkById(5000, function ($rows) use (&$updated, &$read) {
                $read += $rows->count();
                foreach ($rows->groupBy(fn ($r) => LegacySalesImporter::age($r->clientAge) ?? 0) as $age => $group) {
                    $updated += DB::table('agent_transaction_details')->whereIn('agent_transaction_id', $group->pluck('id'))
                        ->update(['client_age' => $age ?: null]);
                }
            });

        $this->option('dry-run') ? DB::rollBack() : DB::commit();
        $this->info(($this->option('dry-run') ? '[DRY RUN] ' : '').number_format($read).' legacy sales with an age; '.number_format($updated).' sales updated.');

        return self::SUCCESS;
    }
}
