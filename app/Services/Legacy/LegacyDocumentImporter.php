<?php

namespace App\Services\Legacy;

use App\Models\Entities\AgentDocument;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

/**
 * Legacy member_docs → agent_documents (see docs/legacy-migration/documents.md). Idempotent: rows keep their legacy
 * id and are upserted. member_docs.agent_id is the member *number*: memberid → members.id (= agents.id), like sales.
 * renewed_status 'stable' = the latest of that type; when several are stable only the newest stays current.
 */
class LegacyDocumentImporter
{
    private const TYPES = ['prc' => 'prc', 'dhsud' => 'dhsud', 'contract' => 'contract', 'cpd' => 'cpd', 'new-entry' => 'new_entry'];

    private const STATUSES = [
        'valid' => AgentDocument::STATUS_VALID,
        'pending' => AgentDocument::STATUS_PENDING,
        'for re-upload' => AgentDocument::STATUS_FOR_REUPLOAD,
    ];

    private ConnectionInterface $legacy;

    private array $stats = [
        'read' => 0, 'imported' => 0, 'current' => 0, 'stable_superseded' => 0,
        'agent_not_found' => 0, 'unknown_type' => 0, 'unknown_status' => 0,
    ];

    public function __construct()
    {
        $this->legacy = DB::connection('legacy');
    }

    /**
     * @return array{stats: array<string, int>}
     */
    public function run(bool $dryRun = false): array
    {
        // A few memberids repeat; the newest member row is the one that was imported as the agent.
        $agentOfMemberId = $this->legacy->table('members')->where('memberid', '>', 0)->orderBy('id')->pluck('id', 'memberid')->all();
        $agents = array_fill_keys(DB::table('agents')->pluck('id')->all(), true);

        $rows = [];
        $newestStable = [];

        foreach ($this->legacy->table('member_docs')->orderBy('id')->cursor() as $doc) {
            $this->stats['read']++;
            $agentId = $agentOfMemberId[(int) $doc->agent_id] ?? null;
            $type = self::TYPES[strtolower(trim((string) $doc->type))] ?? null;

            if (! $agentId || ! isset($agents[$agentId])) {
                $this->stats['agent_not_found']++;
                continue;
            }
            if (! $type) {
                $this->stats['unknown_type']++;
                continue;
            }

            $status = self::STATUSES[strtolower(trim((string) $doc->status))] ?? null;
            if (! $status) {
                $this->stats['unknown_status']++;
                $status = AgentDocument::STATUS_PENDING;
            }

            if (strtolower(trim((string) $doc->renewed_status)) === 'stable') {
                $key = "{$agentId}:{$type}";
                if (isset($newestStable[$key])) {
                    $this->stats['stable_superseded']++;
                }
                $newestStable[$key] = (int) $doc->id;
            }

            $rows[(int) $doc->id] = [
                'id' => (int) $doc->id,
                'agent_id' => $agentId,
                'type' => $type,
                'file_url' => trim((string) $doc->file_url),
                'file_name' => $this->fileName($doc),
                'status' => $status,
                'is_current' => false,
                'remarks' => trim((string) $doc->remarks) ?: null,
                // Legacy kept no reviewer; a decided document was last decided when it was last updated.
                'reviewed_at' => $status === AgentDocument::STATUS_PENDING ? null : $doc->updated_at,
                'created_at' => $doc->created_at,
                'updated_at' => $doc->updated_at,
            ];
        }

        foreach ($newestStable as $id) {
            $rows[$id]['is_current'] = true;
        }
        $this->stats['current'] = count($newestStable);
        $this->stats['imported'] = count($rows);

        DB::beginTransaction();
        try {
            foreach (array_chunk(array_values($rows), 500) as $chunk) {
                DB::table('agent_documents')->upsert($chunk, ['id'], ['agent_id', 'type', 'file_url', 'file_name', 'status', 'is_current', 'remarks', 'reviewed_at', 'created_at', 'updated_at']);
            }
            $dryRun ? DB::rollBack() : DB::commit();
        } catch (Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        return ['stats' => $this->stats];
    }

    // The upload log (JSON) has the original file name; fall back to the last part of the URL.
    private function fileName(object $doc): ?string
    {
        $log = json_decode((string) $doc->logs, true);
        $name = is_array($log) && is_string($log['fileName'] ?? null) ? $log['fileName'] : basename((string) parse_url((string) $doc->file_url, PHP_URL_PATH));

        return trim($name) === '' ? null : Str::limit(trim(rawurldecode($name)), 250, '');
    }
}
