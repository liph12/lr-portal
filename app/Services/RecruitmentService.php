<?php

namespace App\Services;

use App\Support\DataCache;
use App\Models\Entities\Agent;
use App\Models\User;
use App\Support\Areas;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// Dashboard › Overview: members and recruits, and how far new sign-ups are with their training.
// NAO is tracked as a percentage (agent_attributes.nao_video_tracker, 100 = finished); FIRE as a certificate
// count where 3 is complete (so 1 = 33%, 2 = 67%, 3+ = 100%). Training is only traced for recruits who haven't
// made a sale yet — once someone sells, they're past onboarding.
class RecruitmentService
{
    public const NAO_COMPLETE = 100;

    public const FIRE_COMPLETE = 3;

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function filters(array $input): array
    {
        $today = CarbonImmutable::today();
        $from = $this->date($input['from'] ?? null) ?? $today->startOfYear();
        $to = $this->date($input['to'] ?? null) ?? $today;
        if ($from->gt($to)) {
            [$from, $to] = [$to, $from];
        }

        return [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'nao' => in_array($input['nao'] ?? null, ['finished', 'not_finished'], true) ? $input['nao'] : null,
            'fire' => in_array($input['fire'] ?? null, ['0', '1', '2', 'complete'], true) ? $input['fire'] : null,
            'status' => in_array($input['status'] ?? null, User::STATUSES, true) ? $input['status'] : null,
            'q' => trim((string) ($input['q'] ?? '')) ?: null,
            'sort' => in_array($input['sort'] ?? null, ['name', 'signed_up', 'nao', 'fire'], true) ? $input['sort'] : 'signed_up',
            'dir' => ($input['dir'] ?? null) === 'asc' ? 'asc' : 'desc',
            'page' => max(1, (int) ($input['page'] ?? 1)),
            'per_page' => in_array((int) ($input['per_page'] ?? 0), [25, 50, 100], true) ? (int) $input['per_page'] : 25,
        ];
    }

    /**
     * Page props for the overview (dashboard or My Team): filters, scope header, cards and the trainees table.
     *
     * @param  array<string, int>|null  $scope
     * @return array<string, mixed>
     */
    public function props(Request $request, ?array $scope): array
    {
        $f = $this->filters($request->query());

        // The header names the reader's own team / sub-team; a clicked sponsor is named by the caller.
        $own = array_intersect_key($scope ?? [], array_flip(['team_id', 'sub_team_id']));

        return [
            'filters' => $f + array_intersect_key($scope ?? [], array_flip(['team_id', 'sub_team_id', 'sponsor_id', 'area'])),
            'scope' => fn () => $own ? app(SalesReportService::class)->scope(app(SalesReportService::class)->filters($own)) : null,
            'summary' => fn () => $this->summary($f, $scope),
            'trainees' => function () use ($f, $scope) {
                $page = $this->table($f, $scope);

                return ['data' => $page->items(), 'total' => $page->total(), 'page' => $page->currentPage(), 'per_page' => $page->perPage()];
            },
            'statuses' => User::STATUSES,
        ];
    }

    /**
     * Cards: members by status (now), recruits in the range by status, and NAO / FIRE progress of trainees.
     *
     * @param  array<string, mixed>  $f
     * @param  array<string, int>|null  $scope  team_id / sub_team_id / sponsor_id (any combination), or null for everyone
     * @return array<string, mixed>
     */
    public function summary(array $f, ?array $scope): array
    {
        return DataCache::remember('RecruitmentService.summary', [$f, $scope], fn () => $this->computeSummary($f, $scope));
    }

    private function computeSummary(array $f, ?array $scope): array
    {
        $byStatus = fn (Builder $q) => (clone $q)->join('users as su', 'su.id', '=', 'a.user_id')
            ->selectRaw(Agent::statusSql('su.status').' as status, COUNT(*) as n')->groupByRaw(Agent::statusSql('su.status'))->pluck('n', 'status')->map(fn ($n) => (int) $n);

        $members = $byStatus($this->agents($scope));
        $recruits = $byStatus($this->recruits($f, $scope));

        $trainees = $this->trainees($f, $scope)->leftJoin('agent_attributes as tt', 'tt.agent_id', '=', 'a.id');
        $training = (clone $trainees)->selectRaw(
            'COUNT(*) as total,
             SUM(CASE WHEN COALESCE(tt.nao_video_tracker, 0) >= ? THEN 1 ELSE 0 END) as nao_finished,
             COALESCE(AVG(CASE WHEN COALESCE(tt.nao_video_tracker, 0) > ? THEN ? ELSE COALESCE(tt.nao_video_tracker, 0) END), 0) as nao_average,
             SUM(CASE WHEN COALESCE(tt.fire_certificates, 0) = 0 THEN 1 ELSE 0 END) as fire_0,
             SUM(CASE WHEN tt.fire_certificates = 1 THEN 1 ELSE 0 END) as fire_1,
             SUM(CASE WHEN tt.fire_certificates = 2 THEN 1 ELSE 0 END) as fire_2,
             SUM(CASE WHEN tt.fire_certificates >= ? THEN 1 ELSE 0 END) as fire_complete,
             COALESCE(AVG(CASE WHEN COALESCE(tt.fire_certificates, 0) > ? THEN ? ELSE COALESCE(tt.fire_certificates, 0) END), 0) as fire_average',
            [self::NAO_COMPLETE, self::NAO_COMPLETE, self::NAO_COMPLETE, self::FIRE_COMPLETE, self::FIRE_COMPLETE, self::FIRE_COMPLETE],
        )->first();

        $total = (int) $training->total;
        $pct = fn ($n) => $total ? round((int) $n / $total * 100, 1) : 0.0;

        return [
            'members' => ['total' => $members->sum(), 'by_status' => $this->statusCounts($members)],
            'recruits' => ['total' => $recruits->sum(), 'by_status' => $this->statusCounts($recruits)],
            'trainees' => $total,
            'nao' => [
                'finished' => (int) $training->nao_finished,
                'not_finished' => $total - (int) $training->nao_finished,
                'finished_pct' => $pct($training->nao_finished),
                'average_pct' => round((float) $training->nao_average, 1),
            ],
            'fire' => [
                'levels' => [
                    ['label' => '0 of 3 (0%)', 'count' => (int) $training->fire_0, 'pct' => $pct($training->fire_0)],
                    ['label' => '1 of 3 (33%)', 'count' => (int) $training->fire_1, 'pct' => $pct($training->fire_1)],
                    ['label' => '2 of 3 (67%)', 'count' => (int) $training->fire_2, 'pct' => $pct($training->fire_2)],
                    ['label' => '3 or more (100%)', 'count' => (int) $training->fire_complete, 'pct' => $pct($training->fire_complete)],
                ],
                'complete_pct' => $pct($training->fire_complete),
                'average_pct' => round((float) $training->fire_average / self::FIRE_COMPLETE * 100, 1),
            ],
        ];
    }

    /**
     * The trainees table: recruits in the range without a sale, with their NAO and FIRE progress.
     *
     * @param  array<string, mixed>  $f
     * @param  array<string, int>|null  $scope
     */
    public function table(array $f, ?array $scope): LengthAwarePaginator
    {
        return DataCache::page('RecruitmentService.table', [$f, $scope], fn () => $this->computeTable($f, $scope));
    }

    private function computeTable(array $f, ?array $scope): LengthAwarePaginator
    {
        $query = $this->trainees($f, $scope)
            ->join('users as u', 'u.id', '=', 'a.user_id')
            ->leftJoin('agent_attributes as at', 'at.agent_id', '=', 'a.id')
            ->leftJoin('team_agents as ta', fn ($j) => $j->on('ta.agent_id', '=', 'a.id')->where('ta.status', 'active'))
            ->leftJoin('teams as t', 't.id', '=', 'ta.team_id')
            ->leftJoin('sub_team_agents as sa', fn ($j) => $j->on('sa.agent_id', '=', 'a.id')->where('sa.status', 'active'))
            ->leftJoin('sub_teams as s', 's.id', '=', 'sa.sub_team_id')
            // The upline: referral_id is the sponsor's member number, which is their agent id here.
            ->leftJoin('agents as sp', 'sp.id', '=', 'at.referral_id')
            ->leftJoin('users as spu', 'spu.id', '=', 'sp.user_id')
            ->select(
                'a.id', 'a.avatar', 'a.area', 'a.created_at as signed_up', 'u.name', 'u.email', 't.name as team',
                's.name as sub_team', 'at.referral_id as sponsor_id', 'spu.name as sponsor_name', 'spu.email as sponsor_email',
            )
            ->selectRaw('CASE WHEN COALESCE(at.nao_video_tracker, 0) > ? THEN ? ELSE COALESCE(at.nao_video_tracker, 0) END as nao', [self::NAO_COMPLETE, self::NAO_COMPLETE])
            ->selectRaw('COALESCE(at.fire_certificates, 0) as fire');

        if ($f['nao'] === 'finished') {
            $query->where('at.nao_video_tracker', '>=', self::NAO_COMPLETE);
        } elseif ($f['nao'] === 'not_finished') {
            $query->where(fn ($q) => $q->whereNull('at.nao_video_tracker')->orWhere('at.nao_video_tracker', '<', self::NAO_COMPLETE));
        }

        if ($f['fire'] === 'complete') {
            $query->where('at.fire_certificates', '>=', self::FIRE_COMPLETE);
        } elseif ($f['fire'] !== null) {
            (int) $f['fire'] === 0
                ? $query->where(fn ($q) => $q->whereNull('at.fire_certificates')->orWhere('at.fire_certificates', 0))
                : $query->where('at.fire_certificates', (int) $f['fire']);
        }

        $query->selectRaw(Agent::statusSql().' as status');
        if ($f['status']) {
            $query->whereRaw(Agent::statusSql().' = ?', [$f['status']]);
        }
        if ($f['q'] !== null && mb_strlen($f['q']) >= 2) {
            $like = '%'.addcslashes($f['q'], '%_\\').'%';
            $query->where(fn ($q) => $q->where('u.name', 'like', $like)->orWhere('u.email', 'like', $like));
        }

        $sort = ['name' => 'u.name', 'signed_up' => 'a.created_at', 'nao' => 'nao', 'fire' => 'fire'][$f['sort']];

        return $query->orderBy($sort, $f['dir'])->orderBy('a.id')
            ->paginate($f['per_page'], ['*'], 'page', $f['page'])
            ->through(fn ($r) => [
                'id' => $r->id,
                'name' => $r->name,
                'email' => $r->email,
                'avatar' => $r->avatar,
                'area' => $r->area ? Areas::name($r->area) : null,
                'team' => $r->team,
                'sub_team' => $r->sub_team,
                // The sponsor may not have been imported (an old member); then only their number is known.
                'sponsor' => $r->sponsor_id ? ['id' => (int) $r->sponsor_id, 'name' => $r->sponsor_name, 'email' => $r->sponsor_email] : null,
                'status' => $r->status,
                'signed_up' => substr((string) $r->signed_up, 0, 10),
                'nao' => (int) $r->nao,
                'fire' => (int) $r->fire,
                'fire_pct' => (int) round(min((int) $r->fire, self::FIRE_COMPLETE) / self::FIRE_COMPLETE * 100),
            ]);
    }

    // Everyone in the scope (fully registered local agents only): all agents, or the current (active) members of a team / sub-team.
    private function agents(?array $scope): Builder
    {
        $query = DB::table('agents as a')->where('a.agent_type', Agent::TYPE_LOCAL)->whereIn('a.id', Agent::fullyRegisteredIds());

        if (isset($scope['team_id'])) {
            $query->whereIn('a.id', DB::table('team_agents')->where('team_id', $scope['team_id'])->where('status', 'active')->select('agent_id'));
        }
        if (isset($scope['sub_team_id'])) {
            $query->whereIn('a.id', DB::table('sub_team_agents')->where('sub_team_id', $scope['sub_team_id'])->where('status', 'active')->select('agent_id'));
        }
        if (isset($scope['area'])) {
            $query->where('a.area', $scope['area']);
        }
        // Recruits of one sponsor (upline).
        if (isset($scope['sponsor_id'])) {
            $query->whereIn('a.id', DB::table('agent_attributes')->where('referral_id', $scope['sponsor_id'])->select('agent_id'));
        }

        return $query;
    }

    // Members who signed up within the range.
    private function recruits(array $f, ?array $scope): Builder
    {
        return $this->agents($scope)->whereBetween('a.created_at', [$f['from'].' 00:00:00', $f['to'].' 23:59:59']);
    }

    // Recruits who haven't made a sale yet (any category, any status): the ones still in onboarding.
    private function trainees(array $f, ?array $scope): Builder
    {
        return $this->recruits($f, $scope)
            ->whereNotExists(fn ($q) => $q->from('agent_transactions as st')->whereColumn('st.agent_id', 'a.id'));
    }

    /**
     * @param  \Illuminate\Support\Collection<string, int>  $counts
     * @return array<string, int>
     */
    private function statusCounts($counts): array
    {
        return User::statisticCounts($counts);
    }

    private function date(mixed $value): ?CarbonImmutable
    {
        if (! is_string($value) || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return null;
        }

        try {
            return CarbonImmutable::createFromFormat('Y-m-d', $value)->startOfDay();
        } catch (\Throwable) {
            return null;
        }
    }
}
