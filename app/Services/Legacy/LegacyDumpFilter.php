<?php

namespace App\Services\Legacy;

// Drops every statement about the excluded tables from a MySQL dump read line by line (mysqldump or phpMyAdmin output):
// a statement that names one of them is skipped up to the line that ends it with ";". Values never hold a raw new line
// (dumps escape them as \n), so a line ending in ";" closes the statement.
class LegacyDumpFilter
{
    private const STATEMENT = '/^\s*(?:\/\*!\d+\s+)?(?:INSERT\s+(?:IGNORE\s+)?INTO|REPLACE\s+INTO|CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|DROP\s+TABLE(?:\s+IF\s+EXISTS)?|LOCK\s+TABLES|ALTER\s+TABLE|TRUNCATE\s+TABLE)\s+`([^`]+)`/i';

    private bool $skipping = false;

    public int $skippedStatements = 0;

    /**
     * @param  string[]  $excluded  table names
     */
    public function __construct(private array $excluded) {}

    // The line to write, or null when it belongs to an excluded table.
    public function line(string $line): ?string
    {
        if (! $this->skipping && preg_match(self::STATEMENT, $line, $m) && in_array($m[1], $this->excluded, true)) {
            $this->skipping = true;
            $this->skippedStatements++;
        }
        if ($this->skipping) {
            if (str_ends_with(rtrim($line), ';')) {
                $this->skipping = false;
            }

            return null;
        }

        return $line;
    }
}
