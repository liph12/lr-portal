<?php

namespace App\Services\Legacy;

// Starts `legacy:migrate` for a run queued from the page as a process of its own: an import takes minutes, longer than a
// request (or a queue job's retry window) should live. Its console output goes to storage/logs/legacy-migration.log.
class LegacyMigrationLauncher
{
    public function launch(int $runId): void
    {
        // Under php-fpm PHP_BINARY is the fpm daemon, not the CLI.
        $php = config('legacy.php_binary') ?: (str_contains(basename(PHP_BINARY), 'fpm') ? 'php' : PHP_BINARY);
        exec(sprintf(
            'cd %s && nohup %s artisan legacy:migrate --run=%d --no-interaction > %s 2>&1 &',
            escapeshellarg(base_path()),
            escapeshellarg($php),
            $runId,
            escapeshellarg(storage_path('logs/legacy-migration.log')),
        ));
    }
}
