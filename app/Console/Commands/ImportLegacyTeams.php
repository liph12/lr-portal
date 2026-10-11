<?php

namespace App\Console\Commands;

use App\Services\Legacy\LegacyTeamImporter;
use Illuminate\Console\Command;

class ImportLegacyTeams extends Command
{
    protected $signature = 'legacy:import-teams
        {--dry-run : Run everything inside a transaction and roll it back}';

    protected $description = 'Import legacy sales teams, sub-teams and their memberships (see docs/legacy-migration/teams.md)';

    public function handle(LegacyTeamImporter $importer): int
    {
        // ~100k membership rows and the agent id lookup are held in memory.
        ini_set('memory_limit', '1G');

        $dryRun = (bool) $this->option('dry-run');
        $this->info(($dryRun ? '[DRY RUN] ' : '').'Importing legacy teams from the "legacy" connection…');
        $this->line('Run legacy:import-members first: teams attach to agents by their legacy member id.');

        $result = $importer->run($dryRun);

        $this->table(['Result', 'Count'], collect($result['stats'])->map(fn ($v, $k) => [str_replace('_', ' ', $k), number_format($v)])->values());

        if ($result['skipped']) {
            $this->warn(count($result['skipped']).' skipped:');
            $this->table(['Legacy id', 'Reason'], $result['skipped']);
        }

        $this->info($dryRun ? 'Dry run finished: nothing was saved.' : 'Import finished.');

        return self::SUCCESS;
    }
}
