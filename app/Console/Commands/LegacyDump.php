<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Process\Process;

class LegacyDump extends Command
{
    protected $signature = 'legacy:dump {--output= : Where to write the .sql.gz (default storage/app/private/legacy/)}';

    protected $description = 'Dump the legacy database (LEGACY_DB_*, e.g. the old live server) to a .sql.gz without the excluded tables';

    public function handle(): int
    {
        $db = config('database.connections.legacy');
        $dir = config('legacy.dump_dir');
        is_dir($dir) || mkdir($dir, 0775, true);
        $file = $this->option('output') ?: $dir.'/'.$db['database'].'-'.now()->format('Ymd-His').'.sql.gz';
        $excluded = config('legacy.excluded_tables');

        $args = [
            'mysqldump', '-h', $db['host'], '-P', $db['port'], '-u', $db['username'],
            // A consistent read without locking the live tables; no tablespaces / column statistics (need extra privileges).
            '--single-transaction', '--quick', '--skip-lock-tables', '--no-tablespaces', '--column-statistics=0',
            '--default-character-set=utf8mb4', '--set-gtid-purged=OFF', '--triggers',
            ...array_map(fn ($t) => '--ignore-table='.$db['database'].'.'.$t, $excluded),
            $db['database'],
        ];
        $command = 'set -o pipefail; '.implode(' ', array_map('escapeshellarg', $args)).' | gzip -6 > '.escapeshellarg($file);
        $this->line("Dumping {$db['database']} from {$db['host']} without ".implode(', ', $excluded).'…');

        $process = Process::fromShellCommandline('bash -c '.escapeshellarg($command), null, ['MYSQL_PWD' => (string) $db['password']], null, null);
        $process->run(fn ($type, $out) => $type === Process::ERR ? $this->getOutput()->write($out) : null);
        if (! $process->isSuccessful()) {
            @unlink($file);
            $this->error('mysqldump failed (see above).');

            return self::FAILURE;
        }
        $this->info(sprintf('Wrote %s (%.1f MB). Load it with: php artisan legacy:restore %s', $file, filesize($file) / 1048576, $file));

        return self::SUCCESS;
    }
}
