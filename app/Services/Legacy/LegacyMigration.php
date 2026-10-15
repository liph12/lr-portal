<?php

namespace App\Services\Legacy;

use App\Models\User;
use App\Support\DataCache;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Symfony\Component\Console\Output\BufferedOutput;
use Throwable;

// Legacy database → this portal: the steps of config('legacy.steps') run in order, each recorded in legacy_migration_runs
// (status, seconds, the end of its output) for Settings › Legacy migration.
class LegacyMigration
{
    // A run still "running" after this long without a step finishing is taken as dead (a killed process).
    private const STALE_MINUTES = 240;

    /**
     * @return array<string, string> command => what it does
     */
    public function steps(): array
    {
        return config('legacy.steps');
    }

    /**
     * The legacy database as the import sees it: reachable, its size, and the excluded tables in it.
     *
     * @return array<string, mixed>
     */
    public function source(): array
    {
        $config = config('database.connections.legacy');
        $info = ['database' => $config['database'], 'host' => $config['host'] ?? 'local', 'connected' => false, 'tables' => 0, 'size_mb' => 0, 'excluded' => [], 'error' => null];
        try {
            // Its own tables only (MySQL lists every database on the server); SQLite has a single schema.
            $tables = collect(Schema::connection('legacy')->getTables())
                ->filter(fn ($t) => DB::connection('legacy')->getDriverName() !== 'mysql' || $t['schema'] === $config['database'])
                ->keyBy('name')
                ->map(fn ($t) => (int) round(($t['size'] ?? 0) / 1048576));

            return [
                ...$info,
                'connected' => true,
                'tables' => $tables->count(),
                'size_mb' => (int) $tables->sum(),
                'excluded' => array_map(fn ($name) => ['name' => $name, 'present' => $tables->has($name), 'size_mb' => $tables[$name] ?? 0], config('legacy.excluded_tables')),
            ];
        } catch (Throwable $e) {
            return [...$info, 'error' => 'Can\'t reach the legacy database: '.$e->getMessage()];
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    public function latest(): ?array
    {
        $run = DB::table('legacy_migration_runs as r')->leftJoin('users as u', 'u.id', '=', 'r.started_by')
            ->orderByDesc('r.id')->first(['r.*', 'u.name as started_by_name']);

        return $run ? [
            'id' => $run->id,
            'status' => $this->isStale($run) ? 'failed' : $run->status,
            'fresh' => (bool) $run->fresh,
            'steps' => json_decode((string) $run->steps, true) ?: [],
            'error' => $this->isStale($run) ? 'The run stopped without finishing (the process was killed?).' : $run->error,
            'started_by' => $run->started_by_name,
            'started_at' => $run->started_at ? Carbon::parse($run->started_at)->toIso8601String() : null,
            'finished_at' => $run->finished_at ? Carbon::parse($run->finished_at)->toIso8601String() : null,
        ] : null;
    }

    public function running(): bool
    {
        $run = DB::table('legacy_migration_runs')->whereIn('status', ['queued', 'running'])->orderByDesc('id')->first();

        return $run !== null && ! $this->isStale($run);
    }

    // A new run, waiting for the command to pick it up.
    public function queue(?User $by, bool $fresh = false): int
    {
        if ($this->running()) {
            throw new RuntimeException('A legacy migration is already running.');
        }

        return DB::table('legacy_migration_runs')->insertGetId([
            'started_by' => $by?->id, 'status' => 'queued', 'fresh' => $fresh,
            'steps' => json_encode(array_map(fn ($command, $label) => ['command' => $command, 'label' => $label, 'status' => 'waiting'], array_keys($this->steps()), $this->steps())),
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    /**
     * Runs the steps (all, from one, or just one); $echo receives each step's output as it finishes.
     *
     * @param  callable(string $command, string $output, bool $ok): void  $echo
     */
    public function run(int $runId, ?string $from, ?string $only, callable $echo): bool
    {
        $commands = array_keys($this->steps());
        if ($only !== null) {
            $commands = [$only];
        } elseif ($from !== null) {
            $commands = array_slice($commands, (int) array_search($from, $commands, true));
        }

        $this->update($runId, ['status' => 'running', 'started_at' => now()]);
        foreach ($commands as $command) {
            $this->step($runId, $command, ['status' => 'running', 'started_at' => now()->toIso8601String()]);
            $started = microtime(true);
            $buffer = new BufferedOutput;
            try {
                $ok = Artisan::call($command, [], $buffer) === 0;
                $error = $ok ? null : "{$command} exited with an error.";
            } catch (Throwable $e) {
                $ok = false;
                $error = "{$command}: ".$e->getMessage();
            }
            $output = $buffer->fetch();
            $echo($command, $output, $ok);
            $this->step($runId, $command, [
                'status' => $ok ? 'done' : 'failed',
                'seconds' => round(microtime(true) - $started, 1),
                // The end is what matters (counts, rejects file); the whole output can run to megabytes.
                'output' => mb_substr(trim($output), -4000),
            ]);
            if (! $ok) {
                $this->update($runId, ['status' => 'failed', 'error' => $error, 'finished_at' => now()]);
                DataCache::bump();

                return false;
            }
        }
        $this->analyze();
        $this->update($runId, ['status' => 'done', 'finished_at' => now()]);
        DataCache::bump();

        return true;
    }

    // Fresh statistics for every table of a connection: after a bulk import MySQL's are stale and it can pick plans hundreds of
    // times slower (the leaderboards went from 0.1s to 39s, past PHP's time limit). Returns how many tables were analyzed.
    public function analyze(?string $connection = null): int
    {
        $db = DB::connection($connection);
        if (! in_array($db->getDriverName(), ['mysql', 'mariadb'], true)) {
            return 0;
        }
        $tables = collect(Schema::connection($connection)->getTables())->where('schema', $db->getDatabaseName())->pluck('name');
        foreach ($tables->chunk(25) as $chunk) {
            $db->select('ANALYZE TABLE '.$chunk->map(fn ($t) => '`'.str_replace('`', '``', $t).'`')->implode(', '));
        }

        return $tables->count();
    }

    public function fail(int $runId, string $error): void
    {
        $this->update($runId, ['status' => 'failed', 'error' => $error, 'finished_at' => now()]);
    }

    private function step(int $runId, string $command, array $values): void
    {
        $steps = json_decode((string) DB::table('legacy_migration_runs')->where('id', $runId)->value('steps'), true) ?: [];
        foreach ($steps as &$step) {
            if ($step['command'] === $command) {
                $step = $values + $step;
            }
        }
        $this->update($runId, ['steps' => json_encode($steps)]);
    }

    private function update(int $runId, array $values): void
    {
        DB::table('legacy_migration_runs')->where('id', $runId)->update($values + ['updated_at' => now()]);
    }

    private function isStale(object $run): bool
    {
        return in_array($run->status, ['queued', 'running'], true) && Carbon::parse($run->updated_at)->lt(now()->subMinutes(self::STALE_MINUTES));
    }
}
