<?php

namespace App\Console\Commands;

use App\Services\Legacy\LegacyMigration;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Symfony\Component\Console\Output\BufferedOutput;

class LegacyMigrate extends Command
{
    protected $signature = 'legacy:migrate
        {--fresh : Wipe this portal\'s database, migrate and seed it, then import everything (deploy day)}
        {--from= : Start at this step (e.g. legacy:import-sales) after a failure}
        {--only= : Run just this step}
        {--run= : The run started from Settings › Legacy migration}
        {--force : Don\'t ask (and allow --fresh in production)}';

    protected $description = 'Bring this portal\'s database up to date and import the legacy database into it, step by step (see docs/legacy-migration/README.md)';

    public function handle(LegacyMigration $migration): int
    {
        $steps = array_keys($migration->steps());
        foreach (['from', 'only'] as $option) {
            if ($this->option($option) !== null && ! in_array($this->option($option), $steps, true)) {
                $this->error("--{$option} must be one of: ".implode(', ', $steps));

                return self::FAILURE;
            }
        }

        $fresh = (bool) $this->option('fresh');
        if ($fresh && $this->option('run')) {
            $this->error('--fresh can only be run from the command line.');

            return self::FAILURE;
        }
        if ($fresh && app()->isProduction() && ! $this->option('force')) {
            $this->error('--fresh erases the production database: add --force if that is really what you want.');

            return self::FAILURE;
        }
        if ($fresh && ! $this->option('force') && ! $this->confirm('This ERASES the portal database ('.config('database.connections.'.config('database.default').'.database').') and rebuilds it from the legacy one. Continue?')) {
            return self::FAILURE;
        }

        // The schema first: a fresh one, or whatever migrations are new — so the import always meets today's tables.
        $this->components->task($fresh ? 'Rebuilding the database (migrate:fresh --seed)' : 'Applying new migrations', function () use ($fresh) {
            $buffer = new BufferedOutput;
            $code = Artisan::call($fresh ? 'migrate:fresh' : 'migrate', $fresh ? ['--seed' => true, '--force' => true] : ['--force' => true], $buffer);
            $this->line($buffer->fetch(), verbosity: 'v');

            return $code === 0;
        });

        $source = $migration->source();
        $runId = $this->option('run') ? (int) $this->option('run') : $migration->queue(null, $fresh);
        if (! $source['connected']) {
            $migration->fail($runId, $source['error']);
            $this->error($source['error']);

            return self::FAILURE;
        }
        $this->info("Importing from {$source['database']} on {$source['host']} ({$source['size_mb']} MB, {$source['tables']} tables).");

        $ok = $migration->run($runId, $this->option('from'), $this->option('only'), function (string $command, string $output, bool $ok) {
            $this->newLine();
            $ok ? $this->components->info($command) : $this->components->error($command);
            $this->line(trim($output));
        });

        $ok && $this->line('  Table statistics refreshed (a bulk import leaves MySQL\'s stale: slow pages until they are).');
        $ok ? $this->info('Legacy migration finished.') : $this->error('Stopped at a failed step — fix it, then rerun with --from=<that step>.');

        return $ok ? self::SUCCESS : self::FAILURE;
    }
}
