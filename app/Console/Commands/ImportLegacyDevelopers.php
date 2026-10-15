<?php

namespace App\Console\Commands;

use App\Services\Legacy\LegacyDeveloperImporter;
use Illuminate\Console\Command;

class ImportLegacyDevelopers extends Command
{
    protected $signature = 'legacy:import-developers {--dry-run : Run inside a transaction and roll it back}';

    protected $description = 'Import property types, project developers and their projects (before the sales, which point at them)';

    public function handle(LegacyDeveloperImporter $importer): int
    {
        $result = $importer->run((bool) $this->option('dry-run'));
        $this->table(['Result', 'Rows'], collect($result['stats'])->map(fn ($v, $k) => [str_replace('_', ' ', $k), number_format($v)])->values());
        $this->info($this->option('dry-run') ? 'Dry run finished: nothing was saved.' : 'Import finished.');

        return self::SUCCESS;
    }
}
