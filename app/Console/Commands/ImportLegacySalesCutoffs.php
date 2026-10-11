<?php

namespace App\Console\Commands;

use App\Services\Legacy\LegacyCutoffImporter;
use Illuminate\Console\Command;

class ImportLegacySalesCutoffs extends Command
{
    protected $signature = 'legacy:import-sales-cutoffs
        {--dry-run : Run everything inside a transaction and roll it back}';

    protected $description = 'Import legacy monthly sales cutoff dates into sales_cutoffs (see docs/legacy-migration/sales.md)';

    public function handle(LegacyCutoffImporter $importer): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $result = $importer->run($dryRun);

        $this->table(['Result', 'Months'], collect($result['stats'])->map(fn ($v, $k) => [$k, $v])->values());

        if ($result['skipped']) {
            $this->warn(count($result['skipped']).' skipped:');
            $this->table(['Legacy id', 'Reason'], $result['skipped']);
        }

        $this->info($dryRun ? 'Dry run finished: nothing was saved.' : 'Import finished.');

        return self::SUCCESS;
    }
}
