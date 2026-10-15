<?php

namespace App\Console\Commands;

use App\Services\Legacy\LegacyDeveloperImporter;
use Illuminate\Console\Command;

class ImportLegacySaleLinks extends Command
{
    protected $signature = 'legacy:import-sale-links {--dry-run : Run inside a transaction and roll it back}';

    protected $description = 'Fill in sales\' missing developer, project and property type from the legacy sales report';

    public function handle(LegacyDeveloperImporter $importer): int
    {
        $result = $importer->linkSales((bool) $this->option('dry-run'));
        $this->table(['Filled in', 'Sales'], collect($result['stats'])->map(fn ($v, $k) => [str_replace('_', ' ', $k), number_format($v)])->values());
        $this->info($this->option('dry-run') ? 'Dry run finished: nothing was saved.' : 'Sales linked.');

        return self::SUCCESS;
    }
}
