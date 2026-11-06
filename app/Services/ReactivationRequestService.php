<?php

namespace App\Services;

use App\Models\Entities\Agent;
use App\Models\User;
use App\Policies\UserPolicy;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\UploadedFile;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

// A dormant agent's way back before their first sale (Agent::FIRE_DEACTIVATE_AFTER_MONTHS with none since FIRE
// activated them): a supporting file and optional notes, for the back office to review. Approving restarts the
// FIRE-triggered window (AgentActivationService::reactivate); a sale still reactivates on its own either way. Reach
// mirrors NaoApprovalService: nationwide for the back office, else sponsor + led teams/sub-teams + office areas.
class ReactivationRequestService
{
    public const STATUSES = ['pending', 'approved', 'disapproved'];

    private const PER_PAGE = [25, 50, 100];

    public function __construct(
        private SaleFileStorage $files,
        private AgentActivationService $activation,
        private ActivityLogger $activity,
        private TeamLeadershipService $leadership,
        private OfficeService $offices,
    ) {}

    public function submit(Agent $agent, UploadedFile $file, ?string $notes): void
    {
        $folder = "reactivation-requests/{$agent->id}";
        try {
            $path = $this->files->store($file, $folder);
            DB::table('reactivation_requests')->insert([
                'agent_id' => $agent->id,
                'file' => $path,
                'notes' => $notes ?: null,
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable $e) {
            $this->files->discardUploaded();
            throw $e;
        }

        $this->activity->describe('agent.reactivation_requested', 'Sent a request for reactivation', $agent, ['file' => $path]);
    }

    /**
     * @return array{submitted_at: string, file: string, notes: ?string, status: string, decline_reason: ?string}|null
     */
    public function latest(Agent $agent): ?array
    {
        $row = DB::table('reactivation_requests')->where('agent_id', $agent->id)->orderByDesc('created_at')->orderByDesc('id')->first();

        return $row ? [
            'submitted_at' => Carbon::parse($row->created_at)->toIso8601String(),
            'file' => $row->file,
            'notes' => $row->notes,
            'status' => $row->status,
            'decline_reason' => $row->decline_reason,
        ] : null;
    }

    /**
     * null = everyone (back office); false = nobody to review; else whose requests they review.
     *
     * @return array{self: int, sponsor: int, teams: array<int, int>, sub_teams: array<int, int>, areas: array<int, string>}|null|false
     */
    public function reach(User $user): array|null|false
    {
        if ($user->hasAnyRole(UserPolicy::SEARCH_ROLES)) {
            return null;
        }
        $agentId = (int) $user->agent()->value('id');
        if (! $agentId) {
            return false;
        }
        $reach = [
            'self' => $agentId,
            'sponsor' => $agentId,
            'teams' => $this->leadership->teamsLedBy($user)->pluck('id')->map(fn ($id) => (int) $id)->all(),
            'sub_teams' => $this->leadership->subTeamsLedBy($user)->pluck('id')->map(fn ($id) => (int) $id)->all(),
            'areas' => array_values($this->offices->areasFor($user)),
        ];
        $recruits = DB::table('agent_attributes')->where('referral_id', $agentId)->where('agent_id', '!=', $agentId)->exists();

        return $recruits || $reach['teams'] || $reach['sub_teams'] || $reach['areas'] ? $reach : false;
    }

    public function pendingCount(User $user): ?int
    {
        $reach = $this->reach($user);

        return $reach === false ? null : $this->requests($reach)->where('rr.status', 'pending')->count();
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function filters(array $input): array
    {
        return [
            'q' => trim((string) ($input['q'] ?? '')) ?: null,
            'status' => in_array($input['status'] ?? null, [...self::STATUSES, 'all'], true) ? $input['status'] : 'pending',
            'page' => max(1, (int) ($input['page'] ?? 1)),
            'per_page' => in_array((int) ($input['per_page'] ?? 0), self::PER_PAGE, true) ? (int) $input['per_page'] : self::PER_PAGE[0],
        ];
    }

    /**
     * @return array{pending: int, approved: int, disapproved: int, all: int}
     */
    public function counts(array|null $reach, array $f): array
    {
        $byStatus = $this->search($this->requests($reach), $f)->groupBy('rr.status')->selectRaw('rr.status as s, COUNT(*) as n')->pluck('n', 's');
        $counts = array_combine(self::STATUSES, array_map(fn ($s) => (int) ($byStatus[$s] ?? 0), self::STATUSES));

        return $counts + ['all' => array_sum($counts)];
    }

    public function table(array|null $reach, array $f): LengthAwarePaginator
    {
        $query = $this->search($this->requests($reach), $f)->when($f['status'] !== 'all', fn ($q) => $q->where('rr.status', $f['status']));

        return $query->leftJoin('users as ru', 'ru.id', '=', 'rr.reviewed_by')
            ->select('rr.id', 'a.id as agent_id', 'a.avatar', 'u.name', 'u.email', 'rr.file', 'rr.notes', 'rr.status', 'rr.decline_reason',
                'rr.created_at as submitted_at', 'rr.reviewed_at', 'ru.name as reviewed_by')
            ->orderByDesc('rr.created_at')->orderByDesc('rr.id')
            ->paginate($f['per_page'], ['*'], 'page', $f['page']);
    }

    public function canReview(User $user, Agent $agent): bool
    {
        $reach = $this->reach($user);

        return $reach !== false && $this->requests($reach)->where('a.id', $agent->id)->exists();
    }

    public function approve(Agent $agent, User $by): void
    {
        $updated = DB::table('reactivation_requests')->where('agent_id', $agent->id)->where('status', 'pending')
            ->update(['status' => 'approved', 'reviewed_by' => $by->id, 'reviewed_at' => now(), 'updated_at' => now()]);
        if (! $updated) {
            throw ValidationException::withMessages(['reactivation' => 'This request was already reviewed.']);
        }
        $this->activation->reactivate($agent, $by);
    }

    public function disapprove(Agent $agent, User $by, string $reason): void
    {
        $updated = DB::table('reactivation_requests')->where('agent_id', $agent->id)->where('status', 'pending')
            ->update(['status' => 'disapproved', 'decline_reason' => $reason, 'reviewed_by' => $by->id, 'reviewed_at' => now(), 'updated_at' => now()]);
        if (! $updated) {
            throw ValidationException::withMessages(['reactivation' => 'This request was already reviewed.']);
        }
        $this->activity->describe('agent.reactivation_disapproved', 'Disapproved the request for reactivation of '.($agent->user?->name ?? "agent #{$agent->id}"), $agent, ['reason' => $reason]);
    }

    // Requests (any status) within the reach — never the reviewer's own.
    private function requests(array|null $reach): Builder
    {
        $query = DB::table('reactivation_requests as rr')->join('agents as a', 'a.id', '=', 'rr.agent_id')->join('users as u', 'u.id', '=', 'a.user_id');
        if ($reach === null) {
            return $query;
        }

        return $query->where('a.id', '!=', $reach['self'])->where(function (Builder $q) use ($reach) {
            $q->whereExists(fn ($s) => $s->from('agent_attributes as qat')->whereColumn('qat.agent_id', 'a.id')->where('qat.referral_id', $reach['sponsor']));
            if ($reach['areas']) {
                $q->orWhereIn('a.area', $reach['areas']);
            }
            if ($reach['teams']) {
                $q->orWhereExists(fn ($s) => $s->from('team_agents as rta')->whereColumn('rta.agent_id', 'a.id')->where('rta.status', 'active')->whereIn('rta.team_id', $reach['teams']));
            }
            if ($reach['sub_teams']) {
                $q->orWhereExists(fn ($s) => $s->from('sub_team_agents as rsa')->whereColumn('rsa.agent_id', 'a.id')->where('rsa.status', 'active')->whereIn('rsa.sub_team_id', $reach['sub_teams']));
            }
        });
    }

    private function search(Builder $query, array $f): Builder
    {
        if ($f['q'] !== null && mb_strlen($f['q']) >= 2) {
            $like = '%'.addcslashes($f['q'], '%_\\').'%';
            $query->where(fn ($q) => $q->where('u.name', 'like', $like)->orWhere('u.email', 'like', $like));
        }

        return $query;
    }
}
