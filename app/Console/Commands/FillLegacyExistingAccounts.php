<?php

namespace App\Console\Commands;

use App\Services\Legacy\LegacyMemberImporter;
use Illuminate\Console\Command;

// Accounts that were in the portal before the member import (the seeded team, early sign-ups) kept their account, so they
// got no legacy details. This fills in what they lack from their own legacy member, never overwriting. Safe to re-run.
class FillLegacyExistingAccounts extends Command
{
    protected $signature = 'legacy:fill-existing-accounts {--dry-run : Show what would be filled without saving}';

    protected $description = 'Fill in legacy details (agent_attributes, profile, empty agent fields) for agents whose account existed before the import';

    public function handle(LegacyMemberImporter $importer): int
    {
        $result = $importer->fillExistingAccounts((bool) $this->option('dry-run'));

        $this->table(['Agent', 'Rows added', 'Empty fields filled'], collect($result['filled'])->map(fn ($f) => [
            $f['agent_id'],
            implode(', ', $f['tables']),
            $f['columns'] ? implode(', ', $f['columns']) : '—',
        ]));
        foreach ($result['rejects'] as [$id, , $reason]) {
            $this->warn("Skipped member {$id}: {$reason}");
        }
        $this->info(($this->option('dry-run') ? '[DRY RUN] ' : '').count($result['filled']).' agents '.($this->option('dry-run') ? 'would be filled in.' : 'filled in.'));

        return self::SUCCESS;
    }
}
