<?php

namespace App\Console\Commands;

use App\Services\Legacy\LegacySalesImporter;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

// Fixes client names on sales imported before the mapping was corrected: salesreport.name is the agent's name, and
// clientfamilyname the client's full name. Only rows still exactly as the old import wrote them change, so names
// corrected since (Sales validation) are kept. Safe to re-run.
class ImportLegacyClientNames extends Command
{
    protected $signature = 'legacy:import-client-names {--dry-run : Count without saving}';

    protected $description = 'Use salesreport.clientfamilyname (the client) instead of salesreport.name (the agent) as the client name';

    public function handle(): int
    {
        $stats = ['read' => 0, 'fixed' => 0, 'edited_since_kept' => 0, 'not_imported' => 0];

        DB::beginTransaction();

        DB::connection('legacy')->table('salesreport')->select('id', 'name', 'clientfamilyname')->orderBy('id')
            ->chunkById(5000, function ($rows) use (&$stats) {
                $current = DB::table('agent_transaction_details')->whereIn('agent_transaction_id', $rows->pluck('id'))
                    ->get(['agent_transaction_id', 'client_first_name', 'client_last_name'])->keyBy('agent_transaction_id');

                foreach ($rows as $r) {
                    $stats['read']++;
                    $now = $current[$r->id] ?? null;
                    if (! $now) {
                        $stats['not_imported']++;
                        continue;
                    }
                    $fullName = LegacySalesImporter::clientName($r->clientfamilyname);
                    if ($now->client_first_name === $fullName && $now->client_last_name === null) {
                        continue;
                    }
                    // Still the old mapping (first = agent's name, last = client's full name)?
                    $untouched = $now->client_first_name === LegacySalesImporter::cleanText($r->name)
                        && $now->client_last_name === LegacySalesImporter::cleanText($r->clientfamilyname);
                    if (! $untouched) {
                        $stats['edited_since_kept']++;
                        continue;
                    }
                    DB::table('agent_transaction_details')->where('agent_transaction_id', $r->id)
                        ->update(['client_first_name' => $fullName, 'client_middle_name' => null, 'client_last_name' => null]);
                    $stats['fixed']++;
                }
            });

        $this->option('dry-run') ? DB::rollBack() : DB::commit();
        $this->table(['Result', 'Sales'], collect($stats)->map(fn ($n, $k) => [str_replace('_', ' ', $k), number_format($n)])->values());
        $this->info($this->option('dry-run') ? 'Dry run: nothing was saved.' : 'Client names updated.');

        return self::SUCCESS;
    }
}
