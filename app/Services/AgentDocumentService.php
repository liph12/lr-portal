<?php

namespace App\Services;

use App\Models\Entities\Agent;
use App\Models\Entities\AgentDocument;
use App\Models\Entities\AgentDocumentComment;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

// Documentation: reviewing agents' uploaded requirements (PRC, DHSUD, contract, CPD, new entry). The list shows the
// latest document of each type by default; a review sets the status and remarks, comments are reviewers' notes.
class AgentDocumentService
{
    private const PER_PAGE = [25, 50, 100];

    // Keys are the table's column names.
    private const SORTS = ['created_at' => 'd.created_at', 'name' => 'u.name', 'type' => 'd.type', 'status' => 'd.status', 'reviewed_at' => 'd.reviewed_at'];

    public function __construct(private ActivityLogger $activity) {}

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function filters(array $input): array
    {
        return [
            'q' => trim((string) ($input['q'] ?? '')) ?: null,
            'type' => in_array($input['type'] ?? null, AgentDocument::TYPES, true) ? $input['type'] : null,
            'status' => in_array($input['status'] ?? null, AgentDocument::STATUSES, true) ? $input['status'] : null,
            // "latest" (default): only each agent's current document per type; "all": every upload, old ones too.
            'scope' => ($input['scope'] ?? null) === 'all' ? 'all' : 'latest',
            'sort' => array_key_exists($input['sort'] ?? '', self::SORTS) ? $input['sort'] : 'created_at',
            'dir' => ($input['dir'] ?? null) === 'asc' ? 'asc' : 'desc',
            'page' => max(1, (int) ($input['page'] ?? 1)),
            'per_page' => in_array((int) ($input['per_page'] ?? 0), self::PER_PAGE, true) ? (int) $input['per_page'] : self::PER_PAGE[0],
        ];
    }

    public function table(array $f): LengthAwarePaginator
    {
        $query = $this->base($f)
            ->leftJoin('users as r', 'r.id', '=', 'd.reviewed_by')
            ->select('d.id', 'd.agent_id', 'a.avatar', 'u.name', 'u.email', 'd.type', 'd.file_name', 'd.file_url', 'd.status', 'd.is_current', 'd.remarks', 'd.created_at', 'd.reviewed_at', 'r.name as reviewer')
            ->selectSub(fn ($q) => $q->from('agent_document_comments')->whereColumn('agent_document_id', 'd.id')->selectRaw('COUNT(*)'), 'comments_count');

        if ($f['status']) {
            $query->where('d.status', $f['status']);
        }

        return $query->orderBy(self::SORTS[$f['sort']], $f['dir'])->orderByDesc('d.id')
            ->paginate($f['per_page'], ['*'], 'page', $f['page'])
            ->through(fn ($r) => [...(array) $r, 'is_current' => (bool) $r->is_current, 'comments_count' => (int) $r->comments_count]);
    }

    /**
     * How many documents each status has under the other filters (for the status tabs).
     *
     * @return array<string, int>
     */
    public function counts(array $f): array
    {
        $counts = $this->base($f)->selectRaw('d.status, COUNT(*) as n')->groupBy('d.status')->pluck('n', 'status');

        return collect(AgentDocument::STATUSES)->mapWithKeys(fn ($s) => [$s => (int) ($counts[$s] ?? 0)])->all();
    }

    /**
     * One document with its agent, the agent's other uploads of the same type, and the comments.
     *
     * @return array<string, mixed>
     */
    public function detail(AgentDocument $document): array
    {
        $document->load(['agent.user:id,name,email,status', 'reviewer:id,name']);

        return [
            'id' => $document->id,
            'type' => $document->type,
            'file_url' => $document->file_url,
            'file_name' => $document->file_name,
            'status' => $document->status,
            'is_current' => $document->is_current,
            'remarks' => $document->remarks,
            'created_at' => $document->created_at?->toDateTimeString(),
            'reviewed_at' => $document->reviewed_at?->toDateTimeString(),
            'reviewer' => $document->reviewer?->name,
            'agent' => [
                'id' => $document->agent_id,
                'name' => $document->agent?->user?->name ?? trim("{$document->agent?->first_name} {$document->agent?->last_name}"),
                'email' => $document->agent?->user?->email ?? $document->agent?->email,
                'avatar' => $document->agent?->avatar,
                'status' => Agent::displayStatus($document->agent?->user?->status, $document->agent?->activity),
            ],
            'history' => AgentDocument::where('agent_id', $document->agent_id)->where('type', $document->type)->where('id', '!=', $document->id)
                ->orderByDesc('created_at')->orderByDesc('id')
                ->get(['id', 'file_url', 'file_name', 'status', 'is_current', 'created_at'])
                ->map(fn (AgentDocument $d) => [...$d->only(['id', 'file_url', 'file_name', 'status', 'is_current']), 'created_at' => $d->created_at?->toDateTimeString()]),
            'comments' => $document->comments()->with('user:id,name')->leftJoin('agents as ca', 'ca.user_id', '=', 'agent_document_comments.user_id')
                ->orderBy('agent_document_comments.created_at')->orderBy('agent_document_comments.id')
                ->get(['agent_document_comments.*', 'ca.avatar'])
                ->map(fn (AgentDocumentComment $c) => [
                    'id' => $c->id,
                    'body' => $c->body,
                    'author' => $c->user?->name ?? 'Former user',
                    'avatar' => $c->avatar,
                    'created_at' => $c->created_at?->toDateTimeString(),
                ]),
        ];
    }

    /**
     * @param  array{status: string, remarks: ?string, is_current?: bool}  $data
     */
    public function review(AgentDocument $document, User $reviewer, array $data): void
    {
        DB::transaction(function () use ($document, $reviewer, $data) {
            // One latest document per agent and type.
            if (! empty($data['is_current']) && ! $document->is_current) {
                AgentDocument::where('agent_id', $document->agent_id)->where('type', $document->type)->where('is_current', true)->update(['is_current' => false]);
                $document->is_current = true;
            }

            $document->status = $data['status'];
            $document->remarks = trim((string) ($data['remarks'] ?? '')) ?: null;
            $document->reviewed_by = $reviewer->id;
            $document->reviewed_at = now();
            $document->save();
        });

        $this->activity->describe('document.review', "Marked {$this->label($document)} as ".str_replace('_', ' ', $document->status), $document, ['status' => $document->status]);
    }

    public function comment(AgentDocument $document, User $author, string $body): AgentDocumentComment
    {
        $comment = $document->comments()->create(['user_id' => $author->id, 'body' => trim($body)]);

        $this->activity->describe('document.comment', "Commented on {$this->label($document)}", $document);

        return $comment;
    }

    private function base(array $f): \Illuminate\Database\Query\Builder
    {
        $query = DB::table('agent_documents as d')
            ->join('agents as a', 'a.id', '=', 'd.agent_id')
            ->leftJoin('users as u', 'u.id', '=', 'a.user_id')
            ->when($f['scope'] === 'latest', fn ($q) => $q->where('d.is_current', true))
            ->when($f['type'], fn ($q) => $q->where('d.type', $f['type']));

        if ($f['q'] !== null && mb_strlen($f['q']) >= 2) {
            $like = '%'.addcslashes($f['q'], '%_\\').'%';
            $query->where(fn ($q) => $q->where('u.name', 'like', $like)->orWhere('u.email', 'like', $like)->orWhere('d.file_name', 'like', $like));
        }

        return $query;
    }

    private function label(AgentDocument $document): string
    {
        $name = $document->agent?->user?->name ?? "agent #{$document->agent_id}";

        return strtoupper($document->type === 'new_entry' ? 'new entry' : $document->type)." of {$name}";
    }
}
