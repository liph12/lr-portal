<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;

class LegacyRehearse extends Command
{
    protected $signature = 'legacy:rehearse
        {--dump= : Use this .sql / .sql.gz instead of dumping the legacy database}
        {--keep : Keep the rehearsal databases afterwards (to look around in them)}';

    protected $description = 'Rehearse deploy day locally: dump → restore → legacy:migrate --fresh into throwaway databases, then compare with this one';

    // Rows to compare between this database and the rehearsal (what the import fills).
    private const TABLES = [
        'users', 'agents', 'agent_attributes', 'agent_profiles', 'teams', 'sub_teams', 'team_agents', 'sub_team_agents', 'offices',
        'sales_cutoffs', 'agent_transactions', 'agent_project_transactions', 'agent_rental_transactions', 'agent_brokerage_transactions',
        'international_sales', 'agent_documents', 'project_property_types', 'developers', 'developer_projects',
    ];

    // Links that count rows can't see (a fresh rebuild once lost every sale's developer): label => [table, column].
    private const LINKS = [
        'project sales with a developer' => ['agent_project_transactions', 'developer_id'],
        'project sales with a project' => ['agent_project_transactions', 'developer_project_id'],
        'project sales with a property type' => ['agent_project_transactions', 'project_property_type_id'],
        'rentals with a property type' => ['agent_rental_transactions', 'project_property_type_id'],
        'agents with a branch' => ['agents', 'area'],
    ];

    public function handle(): int
    {
        if (app()->isProduction()) {
            $this->error('A rehearsal is for a development machine.');

            return self::FAILURE;
        }
        // With a cached config the steps would ignore the rehearsal databases and work on the real ones.
        if (app()->configurationIsCached()) {
            $this->error('The config is cached: run `php artisan config:clear` first.');

            return self::FAILURE;
        }
        if (DB::getDriverName() !== 'mysql') {
            $this->error('A rehearsal needs MySQL (it creates databases next to this one).');

            return self::FAILURE;
        }

        $portal = (string) config('database.connections.'.config('database.default').'.database');
        $legacy = (string) config('database.connections.legacy.database');
        // Throwaway names, never the real ones: only these are ever dropped.
        $tmpPortal = $portal.'_rehearsal';
        $tmpLegacy = $legacy.'_rehearsal';
        $dump = $this->option('dump');
        $ownDump = $dump === null;
        $dump ??= sys_get_temp_dir().'/'.$legacy.'-rehearsal-'.getmypid().'.sql.gz';
        $times = [];

        $this->components->info("Rehearsing deploy day: {$legacy} → {$tmpLegacy} → {$tmpPortal} (your {$portal} and {$legacy} are only read).");
        try {
            if ($ownDump) {
                $times['1. legacy:dump'] = $this->step(['legacy:dump', '--output='.$dump]);
            } elseif (! is_file($dump)) {
                $this->error("No such file: {$dump}");

                return self::FAILURE;
            }
            $times['2. legacy:restore'] = $this->step(['legacy:restore', $dump, '--force'], ['LEGACY_DB_DATABASE' => $tmpLegacy]);

            DB::statement("DROP DATABASE IF EXISTS `{$tmpPortal}`");
            DB::statement("CREATE DATABASE `{$tmpPortal}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            $times['3. legacy:migrate --fresh'] = $this->step(['legacy:migrate', '--fresh', '--force'], [
                'DB_DATABASE' => $tmpPortal, 'LEGACY_DB_DATABASE' => $tmpLegacy,
                // Nothing of the rehearsal lands in this database's cache.
                'CACHE_STORE' => 'array',
            ]);
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage());
            $this->cleanUp($tmpPortal, $tmpLegacy, $ownDump ? $dump : null);

            return self::FAILURE;
        }

        $this->newLine();
        $this->table(['Phase', 'Time'], collect($times)->map(fn ($s, $phase) => [$phase, $s < 60 ? "{$s}s" : intdiv((int) $s, 60).'m '.((int) $s % 60).'s'])->values()->all());
        $rows = collect(self::TABLES)->map(function ($table) use ($tmpPortal) {
            $mine = DB::table($table)->count();
            $rehearsal = (int) DB::selectOne("SELECT COUNT(*) AS n FROM `{$tmpPortal}`.`{$table}`")->n;

            return [$table, number_format($mine), number_format($rehearsal), $mine === $rehearsal ? '=' : sprintf('%+d', $rehearsal - $mine)];
        });
        $links = collect(self::LINKS)->map(function ($link, $label) use ($tmpPortal) {
            [$table, $column] = $link;
            $mine = DB::table($table)->whereNotNull($column)->count();
            $rehearsal = (int) DB::selectOne("SELECT COUNT(*) AS n FROM `{$tmpPortal}`.`{$table}` WHERE `{$column}` IS NOT NULL")->n;

            return [$label, number_format($mine), number_format($rehearsal), $mine === $rehearsal ? '=' : sprintf('%+d', $rehearsal - $mine)];
        });
        $this->table(['Table', "This database ({$portal})", 'Rehearsal', 'Difference'], [...$rows->all(), ...$links->values()->all()]);
        $this->line('  A small difference is normal: records made here while developing (test sales, sign-ups) aren\'t in the legacy data.');

        $this->option('keep')
            ? $this->components->warn("Kept {$tmpPortal} and {$tmpLegacy} — drop them when done (or run this again without --keep).")
            : $this->cleanUp($tmpPortal, $tmpLegacy, $ownDump ? $dump : null);
        $this->components->info('Rehearsal passed: deploy day works with the current code and migrations.');

        return self::SUCCESS;
    }

    // One deploy-day command, as its own process with the rehearsal databases in its environment; returns the seconds taken.
    private function step(array $command, array $env = []): float
    {
        $this->newLine();
        $this->components->twoColumnDetail('<fg=cyan>php artisan '.implode(' ', $command).'</>', $env ? implode(' ', array_map(fn ($k, $v) => "{$k}={$v}", array_keys($env), $env)) : '');
        $started = microtime(true);
        $process = new Process([PHP_BINARY, '-d', 'memory_limit=2G', base_path('artisan'), ...$command, '--no-interaction'], base_path(), $env, null, null);
        $process->run(fn ($type, $out) => $this->getOutput()->write($out));
        if (! $process->isSuccessful()) {
            throw new \RuntimeException('Stopped: php artisan '.implode(' ', $command).' failed (see above).');
        }

        return round(microtime(true) - $started, 1);
    }

    private function cleanUp(string $tmpPortal, string $tmpLegacy, ?string $dump): void
    {
        DB::statement("DROP DATABASE IF EXISTS `{$tmpPortal}`");
        DB::statement("DROP DATABASE IF EXISTS `{$tmpLegacy}`");
        if ($dump) {
            @unlink($dump);
        }
        $this->line("  Dropped {$tmpPortal} and {$tmpLegacy}.");
    }
}
