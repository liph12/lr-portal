<?php

namespace App\Console\Commands;

use App\Services\Legacy\LegacyAgentTypeImporter;
use Illuminate\Console\Command;

class ImportLegacyAgentTypes extends Command
{
    protected $signature = 'legacy:import-agent-types {--dry-run : Run inside a transaction and roll it back}';

    protected $description = 'Set agents.country, country_code and agent_type from legacy members, and sync the Global Partner role';

    public function handle(LegacyAgentTypeImporter $importer): int
    {
        ini_set('memory_limit', '1G');

        $dryRun = (bool) $this->option('dry-run');
        $stats = $importer->run($dryRun);

        $this->table(['Result', 'Agents'], collect($stats)->map(fn ($v, $k) => [str_replace('_', ' ', $k), number_format($v)])->values());
        $this->info($dryRun ? 'Dry run finished: nothing was saved.' : 'Agent types updated.');

        return self::SUCCESS;
    }
}
