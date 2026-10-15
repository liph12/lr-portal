<?php

namespace App\Console\Commands;

use App\Services\Legacy\LegacyDumpFilter;
use Illuminate\Console\Command;

class LegacyRestore extends Command
{
    protected $signature = 'legacy:restore
        {file : A .sql or .sql.gz dump of the legacy database}
        {--force : Don\'t ask before replacing the legacy database}';

    protected $description = 'Load a legacy dump into the legacy database (LEGACY_DB_*), leaving out the excluded tables';

    public function handle(): int
    {
        $file = $this->argument('file');
        if (! is_file($file)) {
            $this->error("No such file: {$file}");

            return self::FAILURE;
        }
        $db = config('database.connections.legacy');
        if (! $this->option('force') && ! $this->confirm("Replace the database {$db['database']} on {$db['host']} with this dump?")) {
            return self::FAILURE;
        }

        $excluded = config('legacy.excluded_tables');
        $this->line('Leaving out: '.implode(', ', $excluded));
        $this->mysql(sprintf('DROP DATABASE IF EXISTS `%1$s`; CREATE DATABASE `%1$s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;', $db['database']));

        $in = fopen(str_ends_with($file, '.gz') ? 'compress.zlib://'.$file : $file, 'r');
        $process = proc_open([$this->binary('mysql'), ...$this->credentials(), '--default-character-set=utf8mb4', '--max-allowed-packet=1G', $db['database']], [0 => ['pipe', 'r'], 1 => STDOUT, 2 => STDERR], $pipes, null, $this->env());
        $filter = new LegacyDumpFilter($excluded);
        $started = microtime(true);
        $read = $written = 0;
        $next = 100 * 1048576;
        // Checks off for the load (the dump is already consistent): far fewer index rebuilds.
        fwrite($pipes[0], "SET FOREIGN_KEY_CHECKS=0;\nSET UNIQUE_CHECKS=0;\n");
        while (($line = fgets($in)) !== false) {
            $read += strlen($line);
            if (($out = $filter->line($line)) !== null) {
                fwrite($pipes[0], $out);
                $written += strlen($out);
            }
            if ($read >= $next) {
                $this->line(sprintf('  %d MB read, %d MB loaded…', $read / 1048576, $written / 1048576));
                $next += 100 * 1048576;
            }
        }
        fclose($in);
        fclose($pipes[0]);
        $code = proc_close($process);

        if ($code !== 0) {
            $this->error('mysql stopped with an error (see above).');

            return self::FAILURE;
        }
        $analyzed = app(\App\Services\Legacy\LegacyMigration::class)->analyze('legacy');
        $this->line("  Table statistics refreshed ({$analyzed} tables).");
        $this->info(sprintf('Restored %s: %d MB loaded of %d MB read, %d statements of excluded tables left out, in %ds.', $db['database'], $written / 1048576, $read / 1048576, $filter->skippedStatements, microtime(true) - $started));

        return self::SUCCESS;
    }

    private function mysql(string $sql): void
    {
        $process = proc_open([$this->binary('mysql'), ...$this->credentials(), '-e', $sql], [1 => STDOUT, 2 => STDERR], $pipes, null, $this->env());
        if (proc_close($process) !== 0) {
            throw new \RuntimeException('Could not recreate the legacy database.');
        }
    }

    /**
     * @return string[]
     */
    private function credentials(): array
    {
        $db = config('database.connections.legacy');

        return ['-h', (string) $db['host'], '-P', (string) $db['port'], '-u', (string) $db['username']];
    }

    // The password goes in the environment, not the process list.
    private function env(): array
    {
        return [...getenv(), 'MYSQL_PWD' => (string) config('database.connections.legacy.password')];
    }

    private function binary(string $name): string
    {
        return trim((string) shell_exec('command -v '.escapeshellarg($name))) ?: $name;
    }
}
