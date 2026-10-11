<?php

namespace App\Console\Commands;

use App\Services\Legacy\LegacyOfficeImporter;
use Illuminate\Console\Command;

class ImportLegacyOffices extends Command
{
    protected $signature = 'legacy:import-offices {--dry-run : Run inside a transaction and roll it back}';

    protected $description = 'Import legacy offices (branch, area, assigned secretary) into offices';

    public function handle(LegacyOfficeImporter $importer): int
    {
        $result = $importer->run((bool) $this->option('dry-run'));
        $this->table(['Result', 'Offices'], collect($result['stats'])->map(fn ($v, $k) => [str_replace('_', ' ', $k), number_format($v)])->values());
        $this->info($this->option('dry-run') ? 'Dry run finished: nothing was saved.' : 'Import finished.');

        return self::SUCCESS;
    }
}
