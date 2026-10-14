<?php

namespace App\Services;

use App\Models\Entities\Agent;
use App\Models\User;
use App\Policies\UserPolicy;
use App\Support\Areas;
use App\Support\DataCache;
use Illuminate\Database\Query\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

// Approving face-to-face NAO attendances: sent from onboarding (NaoService::submitAttendance) or imported from legacy
// (no "sent" date there). A proof is `yes`; it's approved once reviewed here, or when the NAO already reads 100% (how legacy
// recorded an approval). Reach comes from the data: the back office every one nationwide; anyone else the agents they
// sponsored, plus the current members of the teams / sub-teams they lead, plus an office secretary's branch areas.
// Never their own.
class NaoApprovalService
{
    public const STATUSES = ['pending', 'approved', 'disapproved'];

    private const STATUS_SQL = "CASE WHEN at.nao_attendance_status = 'disapproved' THEN 'disapproved' WHEN at.nao_attendance_reviewed_at IS NOT NULL OR at.nao_video_tracker >= 100 THEN 'approved' ELSE 'pending' END";

    private const SORTS = ['name' => 'u.name', 'attended_on' => 'at.nao_date_of_attendance', 'submitted_at' => 'at.nao_attendance_submitted_at', 'reviewed_at' => 'at.nao_attendance_reviewed_at', 'branch' => 'a.area'];

    private const PER_PAGE = [25, 50, 100];

    public function __construct(private TeamLeadershipService $leadership, private OfficeService $offices, private ActivityLogger $activity) {}

    /**
     * null = everyone (back office); false = nobody to approve; else whose attendances they approve.
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

    // Waiting within the user's reach: the menu badge (null = no menu item).
    public function pendingCount(User $user): ?int
    {
        $reach = $this->reach($user);

        return $reach === false ? null : $this->status($this->submissions($reach), 'pending')->count();
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function filters(array $input): array
    {
        return [
            'q' => trim((string) ($input['q'] ?? '')) ?: null,
            // Waiting first: that's the work.
            'status' => in_array($input['status'] ?? null, [...self::STATUSES, 'all'], true) ? $input['status'] : 'pending',
            // The agent's current team / sub-team (unit manager), and one person: the agent, or everyone they sponsored.
            'team_id' => (int) ($input['team_id'] ?? 0) ?: null,
            'sub_team_id' => (int) ($input['sub_team_id'] ?? 0) ?: null,
            'person' => (int) ($input['person'] ?? 0) ?: null,
            'sort' => array_key_exists($input['sort'] ?? '', self::SORTS) ? $input['sort'] : 'attended_on',
            'dir' => ($input['dir'] ?? null) === 'asc' ? 'asc' : 'desc',
            'page' => max(1, (int) ($input['page'] ?? 1)),
            'per_page' => in_array((int) ($input['per_page'] ?? 0), self::PER_PAGE, true) ? (int) $input['per_page'] : self::PER_PAGE[0],
        ];
    }

    /**
     * @return array{pending: int, approved: int, disapproved: int, all: int}
     */
    public function counts(array|null $reach, array $f): array
    {
        $byStatus = $this->search($this->submissions($reach), $f)->groupByRaw(self::STATUS_SQL)
            ->selectRaw(self::STATUS_SQL.' as s, COUNT(*) as n')->pluck('n', 's');
        $counts = array_combine(self::STATUSES, array_map(fn ($status) => (int) ($byStatus[$status] ?? 0), self::STATUSES));

        return $counts + ['all' => array_sum($counts)];
    }

    public function table(array|null $reach, array $f): LengthAwarePaginator
    {
        $query = $this->search($this->submissions($reach), $f)
            ->when($f['status'] !== 'all', fn ($q) => $this->status($q, $f['status']))
            ->leftJoin('agents as sp', 'sp.id', '=', 'at.referral_id')
            ->leftJoin('users as spu', 'spu.id', '=', 'sp.user_id')
            ->leftJoin('users as ru', 'ru.id', '=', 'at.nao_attendance_reviewed_by')
            ->leftJoin('team_agents as ta', fn ($j) => $j->on('ta.agent_id', '=', 'a.id')->where('ta.status', 'active'))
            ->leftJoin('teams as t', 't.id', '=', 'ta.team_id')
            ->leftJoin('sub_team_agents as sa', fn ($j) => $j->on('sa.agent_id', '=', 'a.id')->where('sa.status', 'active'))
            ->leftJoin('sub_teams as s', 's.id', '=', 'sa.sub_team_id')
            ->select('a.id', 'a.avatar', 'a.area', 'a.mobile', 'u.name', 'u.email', 't.name as team_name', 's.name as sub_team_name',
                'at.referral_id as sponsor_id', 'spu.name as sponsor_name',
                'at.nao_date_of_attendance as attended_on', 'at.nao_attendance_submitted_at as submitted_at', 'at.nao_proof_of_attendance as proof',
                'at.nao_attendance_reviewed_at as reviewed_at', 'ru.name as reviewed_by', 'at.nao_attendance_remarks as remarks')
            ->selectRaw(self::STATUS_SQL.' as status');

        // Legacy rows have no "sent" date: after the dated ones, by NAO date.
        return $query->orderBy(self::SORTS[$f['sort']], $f['dir'])->orderByDesc('at.nao_date_of_attendance')->orderByDesc('a.id')
            ->paginate($f['per_page'], ['*'], 'page', $f['page'])
            ->through(fn ($r) => [
                ...(array) $r,
                'branch' => $r->area ? Areas::name($r->area) : null,
            ]);
    }

    public function canReview(User $user, Agent $agent): bool
    {
        $reach = $this->reach($user);

        return $reach !== false && $this->submissions($reach)->where('a.id', $agent->id)->exists();
    }

    public function approve(Agent $agent, User $by): void
    {
        $this->review($agent, $by, [
            'nao_attendance_status' => NaoService::ATTENDED,
            // Attended in person = the whole orientation (Recruits / Recruits Progress count NAO by this %).
            'nao_video_tracker' => 100,
            'nao_attendance_remarks' => null,
        ]);
        $this->activity->describe('nao.attendance_approved', 'Approved the NAO attendance of '.($agent->user?->name ?? "agent #{$agent->id}"), $agent);
    }

    public function disapprove(Agent $agent, User $by, string $reason): void
    {
        $this->review($agent, $by, ['nao_attendance_status' => NaoService::DISAPPROVED, 'nao_attendance_remarks' => $reason]);
        // Back into onboarding at the NAO step: send another proof or watch the webinar.
        if ($agent->onboarding_step === 'nao') {
            $agent->forceFill(['onboarding_step' => 'photo'])->saveQuietly();
        }
        $this->activity->describe('nao.attendance_disapproved', 'Disapproved the NAO attendance of '.($agent->user?->name ?? "agent #{$agent->id}"), $agent, ['reason' => $reason]);
    }

    /**
     * @param  array<string, mixed>  $values
     */
    private function review(Agent $agent, User $by, array $values): void
    {
        $updated = DB::table('agent_attributes')->where('agent_id', $agent->id)->where('nao_attendance_status', NaoService::ATTENDED)
            ->whereNull('nao_attendance_reviewed_at')->where('nao_video_tracker', '<', 100)
            ->update($values + ['nao_attendance_reviewed_by' => $by->id, 'nao_attendance_reviewed_at' => now(), 'updated_at' => now()]);
        if (! $updated) {
            throw ValidationException::withMessages(['nao' => 'This attendance was already reviewed.']);
        }
    }

    private function status(Builder $query, string $status): Builder
    {
        return match ($status) {
            'disapproved' => $query->where('at.nao_attendance_status', NaoService::DISAPPROVED),
            'pending' => $query->where('at.nao_attendance_status', NaoService::ATTENDED)->whereNull('at.nao_attendance_reviewed_at')->where('at.nao_video_tracker', '<', 100),
            default => $query->where('at.nao_attendance_status', NaoService::ATTENDED)
                ->where(fn ($q) => $q->whereNotNull('at.nao_attendance_reviewed_at')->orWhere('at.nao_video_tracker', '>=', 100)),
        };
    }

    // Attendances (sent proofs, approved or not, and disapproved ones) within the reach — never the reader's own.
    private function submissions(array|null $reach): Builder
    {
        $query = DB::table('agent_attributes as at')
            ->join('agents as a', 'a.id', '=', 'at.agent_id')
            ->join('users as u', 'u.id', '=', 'a.user_id')
            ->whereIn('at.nao_attendance_status', [NaoService::ATTENDED, NaoService::DISAPPROVED]);
        if ($reach === null) {
            return $query;
        }

        return $query->where('a.id', '!=', $reach['self'])->where(function (Builder $q) use ($reach) {
            $q->where('at.referral_id', $reach['sponsor']);
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

    /**
     * Teams and sub-teams (with their unit manager) of the agents in reach: the filter choices.
     *
     * @return array{teams: array<int, array{value: int, label: string}>, sub_teams: array<int, array{value: int, label: string, secondary: ?string, team_id: int}>}
     */
    public function groupOptions(array|null $reach): array
    {
        return DataCache::remember('NaoApprovalService.groupOptions', [$reach], fn () => $this->computeGroupOptions($reach));
    }

    private function computeGroupOptions(array|null $reach): array
    {
        $agents = $this->submissions($reach)->select('a.id');
        $teams = DB::table('team_agents as ta')->join('teams as t', 't.id', '=', 'ta.team_id')
            ->where('ta.status', 'active')->whereIn('ta.agent_id', $agents)
            ->distinct()->orderBy('t.name')->get(['t.id', 't.name']);
        $subTeams = DB::table('sub_team_agents as sa')->join('sub_teams as s', 's.id', '=', 'sa.sub_team_id')
            ->leftJoin('agents as um', 'um.id', '=', 's.agent_id')->leftJoin('users as umu', 'umu.id', '=', 'um.user_id')
            ->where('sa.status', 'active')->whereIn('sa.agent_id', (clone $agents))
            ->distinct()->orderBy('umu.name')->orderBy('s.name')->get(['s.id', 's.name', 's.team_id', 'umu.name as manager']);

        return [
            'teams' => $teams->map(fn ($t) => ['value' => (int) $t->id, 'label' => $t->name])->all(),
            'sub_teams' => $subTeams->map(fn ($s) => ['value' => (int) $s->id, 'label' => $s->manager ?: $s->name, 'secondary' => $s->manager ? $s->name : null, 'team_id' => (int) $s->team_id])->all(),
        ];
    }

    /**
     * Agents and sponsors in reach whose name or email matches: the sponsor / agent filter's choices.
     *
     * @return array<int, array{value: int, label: string, secondary: string}>
     */
    public function personOptions(array|null $reach, string $term): array
    {
        if (mb_strlen($term = trim($term)) < 2) {
            return [];
        }
        $like = '%'.addcslashes($term, '%_\\').'%';
        $agents = $this->submissions($reach)->where(fn ($q) => $q->where('u.name', 'like', $like)->orWhere('u.email', 'like', $like))
            ->limit(10)->get(['a.id', 'u.name', 'u.email'])->map(fn ($r) => ['value' => (int) $r->id, 'label' => $r->name, 'secondary' => $r->email]);
        $sponsors = DB::table('agents as sp')->join('users as spu', 'spu.id', '=', 'sp.user_id')
            ->whereIn('sp.id', $this->submissions($reach)->whereNotNull('at.referral_id')->select('at.referral_id'))
            ->where(fn ($q) => $q->where('spu.name', 'like', $like)->orWhere('spu.email', 'like', $like))
            ->limit(10)->get(['sp.id', 'spu.name', 'spu.email'])->map(fn ($r) => ['value' => (int) $r->id, 'label' => $r->name, 'secondary' => 'Sponsor · '.$r->email]);

        return $sponsors->concat($agents)->unique('value')->values()->all();
    }

    // The picked person, so the filter can show their name after a reload — only someone in reach (an agent or a sponsor).
    public function person(array|null $reach, ?int $id): ?array
    {
        if (! $id || ! $this->submissions($reach)->where(fn ($q) => $q->where('a.id', $id)->orWhere('at.referral_id', $id))->exists()) {
            return null;
        }
        $row = DB::table('agents as a')->join('users as u', 'u.id', '=', 'a.user_id')->where('a.id', $id)->first(['a.id', 'u.name', 'u.email']);

        return $row ? ['value' => (int) $row->id, 'label' => $row->name, 'secondary' => $row->email] : null;
    }

    private function search(Builder $query, array $f): Builder
    {
        if ($f['team_id']) {
            $query->whereExists(fn ($s) => $s->from('team_agents as fta')->whereColumn('fta.agent_id', 'a.id')->where('fta.status', 'active')->where('fta.team_id', $f['team_id']));
        }
        if ($f['sub_team_id']) {
            $query->whereExists(fn ($s) => $s->from('sub_team_agents as fsa')->whereColumn('fsa.agent_id', 'a.id')->where('fsa.status', 'active')->where('fsa.sub_team_id', $f['sub_team_id']));
        }
        if ($f['person']) {
            $query->where(fn ($q) => $q->where('a.id', $f['person'])->orWhere('at.referral_id', $f['person']));
        }
        if ($f['q'] !== null && mb_strlen($f['q']) >= 2) {
            $like = '%'.addcslashes($f['q'], '%_\\').'%';
            $query->where(fn ($q) => $q->where('u.name', 'like', $like)->orWhere('u.email', 'like', $like));
        }

        return $query;
    }
}
