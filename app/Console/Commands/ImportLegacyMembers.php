<?php

namespace App\Console\Commands;

use App\Services\Legacy\LegacyMemberImporter;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class ImportLegacyMembers extends Command
{
    protected $signature = 'legacy:import-members
        {--dry-run : Run everything inside a transaction and roll it back}
        {--limit= : Only read this many members (for a trial run)}
        {--chunk=1000 : Members per batch}';

    protected $description = 'Import legacy leuteriorealty members into users + agents (see docs/legacy-migration/members.md)';

    public function handle(LegacyMemberImporter $importer): int
    {
        // Holds email lookups for ~80k legacy accounts in memory; PHP's CLI default (128M) is too small.
        ini_set('memory_limit', '1G');

        $dryRun = (bool) $this->option('dry-run');
        $limit = $this->option('limit') ? (int) $this->option('limit') : null;

        $this->info(($dryRun ? '[DRY RUN] ' : '').'Importing legacy members from the "legacy" connection…');

        $bar = null;
        $result = $importer->run($dryRun, $limit, (int) $this->option('chunk'), function (int $done, int $total) use (&$bar) {
            $bar ??= tap($this->output->createProgressBar($total))->start();
            $bar->setProgress($done);
        });
        $bar?->finish();
        $this->newLine(2);

        $this->table(['Result', 'Members'], collect($result['stats'])->map(fn ($v, $k) => [str_replace('_', ' ', $k), number_format($v)])->values());
        $this->table(['Role', 'Users with this role'], collect($result['roles'])->map(fn ($v, $k) => [$k, number_format($v)])->values());

        if ($result['rejects']) {
            // Kept in private storage: the file names real people.
            $path = 'legacy-import/members-rejects-'.now()->format('Ymd-His').'.csv';
            $csv = "member_id,email,reason\n".collect($result['rejects'])
                ->map(fn ($r) => implode(',', array_map(fn ($v) => '"'.str_replace('"', '""', (string) $v).'"', $r)))
                ->implode("\n");
            Storage::disk('local')->put($path, $csv);
            $this->warn(count($result['rejects']).' members were not imported — reasons in storage/app/private/'.$path);
        }

        $this->info($dryRun ? 'Dry run finished: nothing was saved.' : 'Import finished.');

        if (! $dryRun) {
            $this->call('agents:refresh-activity');
        }

        return self::SUCCESS;
    }
}
