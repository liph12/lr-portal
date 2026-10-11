<?php

namespace App\Console\Commands;

use App\Services\Legacy\LegacyDocumentImporter;
use Illuminate\Console\Command;

class ImportLegacyDocuments extends Command
{
    protected $signature = 'legacy:import-documents {--dry-run : Run everything inside a transaction and roll it back}';

    protected $description = 'Import legacy member_docs into agent_documents (see docs/legacy-migration/documents.md)';

    public function handle(LegacyDocumentImporter $importer): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $this->info(($dryRun ? '[DRY RUN] ' : '').'Importing legacy member documents…');

        $result = $importer->run($dryRun);

        $this->table(['Result', 'Documents'], collect($result['stats'])->map(fn ($v, $k) => [str_replace('_', ' ', $k), number_format($v)])->values());
        $this->info($dryRun ? 'Dry run finished: nothing was saved.' : 'Import finished.');

        return self::SUCCESS;
    }
}
