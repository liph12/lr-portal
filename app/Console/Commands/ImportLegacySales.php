<?php

namespace App\Console\Commands;

use App\Services\Legacy\LegacySalesImporter;
use Illuminate\Console\Command;

class ImportLegacySales extends Command
{
    protected $signature = 'legacy:import-sales
        {--dry-run : Run everything inside a transaction and roll it back}
        {--limit= : Only read this many sales (for a trial run)}
        {--chunk=1000 : Sales per batch}';

    protected $description = 'Import legacy salesreport into project / rental / brokerage sales (see docs/legacy-migration/sales.md)';

    public function handle(LegacySalesImporter $importer): int
    {
        // Lookups for ~83k members and ~2k projects are held in memory.
        ini_set('memory_limit', '1G');

        $dryRun = (bool) $this->option('dry-run');
        $this->info(($dryRun ? '[DRY RUN] ' : '').'Importing legacy sales from the "legacy" connection…');
        $this->line('Run legacy:import-members first: sales attach to agents by their legacy member id.');

        $bar = null;
        $result = $importer->run(
            $dryRun,
            $this->option('limit') ? (int) $this->option('limit') : null,
            (int) $this->option('chunk'),
            function (int $done, int $total) use (&$bar) {
                $bar ??= tap($this->output->createProgressBar($total))->start();
                $bar->setProgress($done);
            },
        );
        $bar?->finish();
        $this->newLine(2);

        $this->table(['Result', 'Sales'], collect($result['stats'])->map(fn ($v, $k) => [str_replace('_', ' ', $k), number_format($v)])->values());
        $this->info($dryRun ? 'Dry run finished: nothing was saved.' : 'Import finished.');

        return self::SUCCESS;
    }
}
