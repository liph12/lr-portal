<?php

namespace App\Console\Commands;

use App\Services\Legacy\LegacyInternationalSalesImporter;
use Illuminate\Console\Command;

class ImportLegacyInternationalSales extends Command
{
    protected $signature = 'legacy:import-international-sales {--dry-run : Run inside a transaction and roll it back}';

    protected $description = 'Import legacy international_sales_report into international_sales (see docs/legacy-migration/international-sales.md)';

    public function handle(LegacyInternationalSalesImporter $importer): int
    {
        ini_set('memory_limit', '1G');

        $dryRun = (bool) $this->option('dry-run');
        $this->line('Run legacy:import-members first: sales attach to agents by their legacy member id.');

        $stats = $importer->run($dryRun);

        $this->table(['Result', 'Sales'], collect($stats)->map(fn ($v, $k) => [str_replace('_', ' ', $k), number_format($v)])->values());
        $this->info($dryRun ? 'Dry run finished: nothing was saved.' : 'Import finished.');

        return self::SUCCESS;
    }
}
