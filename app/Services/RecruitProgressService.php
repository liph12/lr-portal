<?php

namespace App\Services;

use App\Models\Entities\Agent;
use App\Support\Areas;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

// Reports › Recruits Progress: how the members who signed up in a range are doing, grouped by team, by unit
// manager (sub-team) or by the agent who sponsored them. A recruit "sold" once they have any recorded sale (the same
// line the trainees list uses); their total sales count valid sales only. NAO / FIRE are measured on the recruits
// who haven't sold yet, as in Reports › Recruits.
class RecruitProgressService
{
    public const GROUPS = ['teams', 'sub_teams', 'areas', 'sponsors'];

    private const SALE_TABLES = ['agent_project_transactions', 'agent_rental_transactions', 'agent_brokerage_transactions'];

    /**
     * @param  array<string, mixed>  $input
     * @param  array<int, string>  $groups  the groupings this reader may use
     * @return array<string, mixed>
     */
    public function filters(array $input, array $groups): array
    {
        $base = app(RecruitmentService::class)->filters($input);

        return [
            'from' => $base['from'],
            'to' => $base['to'],
            'group' => in_array($input['group'] ?? null, $groups, true) ? $input['group'] : $groups[0],
            'q' => $base['q'],
            'sort' => in_array($input['sort'] ?? null, ['name', 'recruits', 'sold', 'conversion', 'value', 'nao', 'fire'], true) ? $input['sort'] : 'recruits',
            'dir' => ($input['dir'] ?? null) === 'asc' ? 'asc' : 'desc',
            'page' => $base['page'],
            'per_page' => $base['per_page'],
        ];
    }

    /**
     * Groupings worth offering: inside one team there's nothing to rank by team; inside one sub-team, only sponsors.
     *
     * @param  array<string, int>|null  $scope
     * @return array<int, string>
     */
    public function groupsFor(?array $scope): array
    {
        // Drop the levels the page is already narrowed to (or above); one sponsor's recruits group by team, unit
        // manager or location, never by sponsor.
        $hidden = [
            ...(isset($scope['sponsor_id']) ? ['sponsors'] : []),
            ...(isset($scope['team_id']) || isset($scope['sub_team_id']) ? ['teams'] : []),
            ...(isset($scope['sub_team_id']) ? ['sub_teams'] : []),
            ...(isset($scope['area']) ? ['areas'] : []),
        ];

        return array_values(array_diff(self::GROUPS, $hidden));
    }

    /**
     * The group the page is narrowed to (clicked team / sub-team / area / sponsor), for its header.
     *
     * @param  array<string, int>  $selection
     * @return array{type: string, id: int, name: string, avatar: ?string, facts: array<int, array{label: string, value: string}>}|null
     */
    public function selectionHeader(array $selection): ?array
    {
        if ($id = $selection['sponsor_id'] ?? null) {
            $s = DB::table('agents as a')->leftJoin('users as u', 'u.id', '=', 'a.user_id')->where('a.id', $id)->first(['u.name', 'u.email', 'a.avatar', 'a.area']);

            return ['type' => 'sponsor', 'id' => $id, 'name' => $s->name ?? "Member #{$id}", 'avatar' => $s->avatar ?? null, 'facts' => array_values(array_filter([
                ($s->email ?? null) ? ['label' => 'Email', 'value' => $s->email] : null,
                ($s->area ?? null) ? ['label' => 'Area', 'value' => Areas::name($s->area)] : null,
            ]))];
        }

        $sales = app(SalesReportService::class);
        foreach (['sub_team_id', 'team_id', 'area'] as $key) {
            if ($selection[$key] ?? null) {
                return $sales->scope($sales->filters([$key => $selection[$key]]));
            }
        }

        return null;
    }

    /**
     * KPIs over every recruit in the range, the split by area and sign-ups over time.
     *
     * @param  array<string, mixed>  $f
     * @param  array<string, int>|null  $scope
     * @return array<string, mixed>
     */
    public function summary(array $f, ?array $scope): array
    {
        // One pass over the recruits, grouped by area × month; totals, areas and the trend are added up from it.
        $cells = DB::query()->fromSub($this->recruits($f, $scope), 'r')
            ->groupBy('r.area')
            ->groupByRaw('SUBSTR(CAST(r.signed_up AS CHAR), 1, 7)')
            ->selectRaw('r.area as area, SUBSTR(CAST(r.signed_up AS CHAR), 1, 7) as month, '.$this->measures())
            ->get();

        $sum = fn ($rows) => (object) collect(['recruits', 'sold', 'value', 'trainees', 'nao_finished', 'fire_complete', 'nao_not_started', 'fire_not_started', 'no_activity', 'completed'])
            ->mapWithKeys(fn ($k) => [$k => $rows->sum(fn ($r) => (float) $r->{$k})])->all();

        $totals = $sum($cells);
        $areas = $cells->groupBy(fn ($r) => $r->area ?? '')
            ->map(fn ($rows, $area) => ['area' => $area ?: null, 'name' => Areas::name($area ?: null), ...$this->row($sum($rows))])
            ->sortByDesc('recruits')
            ->values()
            ->all();
        $byMonth = $cells->groupBy('month')->map(fn ($rows) => $sum($rows));

        $trend = [];
        $cursor = CarbonImmutable::parse($f['from'])->startOfMonth();
        while ($cursor->lte(CarbonImmutable::parse($f['to']))) {
            $row = $byMonth->get($cursor->format('Y-m'));
            // `sales` here is the number of recruits, so the chart's count / value switch reads "recruits" / "their sales".
            $trend[] = ['month' => $cursor->format('Y-m'), 'sales' => (int) ($row->recruits ?? 0), 'value' => (float) ($row->value ?? 0)];
            $cursor = $cursor->addMonth();
        }

        return ['kpis' => $this->row($totals), 'areas' => $areas, 'trend' => $trend];
    }

    /**
     * One row per team / sub-team / sponsor, paged.
     *
     * @param  array<string, mixed>  $f
     * @param  array<string, int>|null  $scope
     */
    public function table(array $f, ?array $scope): LengthAwarePaginator
    {
        $grouped = match ($f['group']) {
            'teams' => DB::query()->fromSub($this->recruits($f, $scope), 'r')
                ->leftJoin('teams as g', 'g.id', '=', 'r.team_id')
                ->groupBy('r.team_id', 'g.name')
                ->selectRaw('r.team_id as `key`, g.name as name, NULL as detail, NULL as avatar'),
            'sub_teams' => DB::query()->fromSub($this->recruits($f, $scope), 'r')
                ->leftJoin('sub_teams as g', 'g.id', '=', 'r.sub_team_id')
                ->leftJoin('agents as l', 'l.id', '=', 'g.agent_id')
                ->leftJoin('users as lu', 'lu.id', '=', 'l.user_id')
                ->groupBy('r.sub_team_id', 'g.name', 'lu.name', 'l.avatar')
                ->selectRaw('r.sub_team_id as `key`, g.name as name, lu.name as detail, l.avatar as avatar'),
            'areas' => DB::query()->fromSub($this->recruits($f, $scope), 'r')
                ->groupBy('r.area')
                ->selectRaw('r.area as `key`, r.area as name, NULL as detail, NULL as avatar'),
            default => DB::query()->fromSub($this->recruits($f, $scope), 'r')
                ->leftJoin('agents as g', 'g.id', '=', 'r.sponsor_id')
                ->leftJoin('users as gu', 'gu.id', '=', 'g.user_id')
                ->groupBy('r.sponsor_id', 'gu.name', 'gu.email', 'g.avatar')
                ->selectRaw('r.sponsor_id as `key`, gu.name as name, gu.email as detail, g.avatar as avatar'),
        };
        $grouped->selectRaw($this->measures());

        $query = DB::query()->fromSub($grouped, 'p')->select('p.*')
            ->selectRaw('CASE WHEN p.recruits > 0 THEN p.sold * 100.0 / p.recruits ELSE 0 END as conversion')
            ->selectRaw('CASE WHEN p.trainees > 0 THEN p.nao_finished * 100.0 / p.trainees ELSE 0 END as nao')
            ->selectRaw('CASE WHEN p.trainees > 0 THEN p.fire_complete * 100.0 / p.trainees ELSE 0 END as fire');

        // Only recruits who have a team / sub-team / sponsor are ranked; the KPIs above still count everyone.
        $query->whereNotNull('p.key');

        if ($f['q'] !== null && mb_strlen($f['q']) >= 2) {
            $like = '%'.addcslashes($f['q'], '%_\\').'%';
            $query->where(fn ($q) => $q->where('p.name', 'like', $like)->orWhere('p.detail', 'like', $like));
        }

        $page = $query->orderBy($f['sort'] === 'name' ? 'p.name' : $f['sort'], $f['dir'])->orderBy('p.key')
            ->paginate($f['per_page'], ['*'], 'page', $f['page']);

        // A sponsor's current team, looked up for this page only.
        $teams = $f['group'] === 'sponsors'
            ? DB::table('team_agents as ta')->join('teams as t', 't.id', '=', 'ta.team_id')
                ->whereIn('ta.agent_id', collect($page->items())->pluck('key')->all())->where('ta.status', 'active')
                ->pluck('t.name', 'ta.agent_id')
            : collect();

        return $page->through(fn ($r) => [
            'id' => $r->key,
            // Areas are stored as keys; a sponsor who wasn't imported keeps their member number.
            'name' => $f['group'] === 'areas' ? Areas::name($r->key) : ($r->name ?? "Member #{$r->key}"),
            'detail' => $r->detail,
            'avatar' => $r->avatar,
            'team' => $teams[$r->key] ?? null,
            ...$this->row($r),
        ]);
    }

    /**
     * One row per recruit (signed up in the range, within the scope) with what the measures need.
     *
     * @param  array<string, int>|null  $scope
     */
    private function recruits(array $f, ?array $scope): Builder
    {
        $query = DB::table('agents as a')
            ->leftJoin('agent_attributes as at', 'at.agent_id', '=', 'a.id')
            ->leftJoin('team_agents as ta', fn ($j) => $j->on('ta.agent_id', '=', 'a.id')->where('ta.status', 'active'))
            ->leftJoin('sub_team_agents as sa', fn ($j) => $j->on('sa.agent_id', '=', 'a.id')->where('sa.status', 'active'))
            ->leftJoinSub($this->validSalesByAgent($f), 'sv', 'sv.agent_id', '=', 'a.id')
            ->whereBetween('a.created_at', [$f['from'].' 00:00:00', $f['to'].' 23:59:59'])
            ->where('at.registration_status', Agent::FULLY_REGISTERED)
            ->where('a.agent_type', Agent::TYPE_LOCAL)
            ->select('a.id', 'a.area', 'a.created_at as signed_up', 'ta.team_id', 'sa.sub_team_id', 'at.referral_id as sponsor_id')
            ->selectRaw('COALESCE(sv.value, 0) as value')
            ->selectRaw('CASE WHEN EXISTS (SELECT 1 FROM agent_transactions st WHERE st.agent_id = a.id) THEN 1 ELSE 0 END as sold')
            ->selectRaw('CASE WHEN COALESCE(at.nao_video_tracker, 0) >= ? THEN 1 ELSE 0 END as nao_done', [RecruitmentService::NAO_COMPLETE])
            ->selectRaw('CASE WHEN COALESCE(at.fire_certificates, 0) >= ? THEN 1 ELSE 0 END as fire_done', [RecruitmentService::FIRE_COMPLETE])
            ->selectRaw('CASE WHEN COALESCE(at.nao_video_tracker, 0) > 0 THEN 1 ELSE 0 END as nao_started')
            ->selectRaw('CASE WHEN COALESCE(at.fire_certificates, 0) > 0 THEN 1 ELSE 0 END as fire_started');

        // The reader's reach and whatever they clicked into narrow the recruits together.
        if (isset($scope['team_id'])) {
            $query->where('ta.team_id', $scope['team_id']);
        }
        if (isset($scope['sub_team_id'])) {
            $query->where('sa.sub_team_id', $scope['sub_team_id']);
        }
        if (isset($scope['sponsor_id'])) {
            $query->where('at.referral_id', $scope['sponsor_id']);
        }
        if (isset($scope['area'])) {
            $scope['area'] === SalesReportService::UNASSIGNED_AREA ? $query->whereNull('a.area') : $query->where('a.area', $scope['area']);
        }

        return $query;
    }

    // Valid sales (every category, any date) of the agents who signed up in the range — only theirs, so the sum
    // doesn't walk all ~190k sales.
    private function validSalesByAgent(array $f): Builder
    {
        $recruitIds = fn () => DB::table('agents')->whereBetween('created_at', [$f['from'].' 00:00:00', $f['to'].' 23:59:59'])->select('id');

        $branches = array_map(fn (string $table) => DB::table('agent_transactions as t')
            ->join("{$table} as c", 'c.agent_transaction_id', '=', 't.id')
            ->where('t.sale_status', 'valid')
            ->whereIn('t.agent_id', $recruitIds())
            ->select('t.agent_id', 'c.total_contract_price as value'), self::SALE_TABLES);

        $union = array_shift($branches);
        foreach ($branches as $branch) {
            $union->unionAll($branch);
        }

        return DB::query()->fromSub($union, 'v')->groupBy('v.agent_id')->selectRaw('v.agent_id, SUM(v.value) as value');
    }

    private function measures(): string
    {
        return 'COUNT(*) as recruits, COALESCE(SUM(r.sold), 0) as sold, COALESCE(SUM(r.value), 0) as value,
            COALESCE(SUM(1 - r.sold), 0) as trainees,
            COALESCE(SUM(CASE WHEN r.sold = 0 AND r.nao_done = 1 THEN 1 ELSE 0 END), 0) as nao_finished,
            COALESCE(SUM(CASE WHEN r.sold = 0 AND r.fire_done = 1 THEN 1 ELSE 0 END), 0) as fire_complete,
            COALESCE(SUM(CASE WHEN r.sold = 0 AND r.nao_started = 0 THEN 1 ELSE 0 END), 0) as nao_not_started,
            COALESCE(SUM(CASE WHEN r.sold = 0 AND r.fire_started = 0 THEN 1 ELSE 0 END), 0) as fire_not_started,
            COALESCE(SUM(CASE WHEN r.sold = 0 AND r.nao_started = 0 AND r.fire_started = 0 THEN 1 ELSE 0 END), 0) as no_activity,
            COALESCE(SUM(CASE WHEN r.sold = 0 AND r.nao_done = 1 AND r.fire_done = 1 THEN 1 ELSE 0 END), 0) as completed';
    }

    /**
     * @return array<string, mixed>
     */
    private function row(object $r): array
    {
        $recruits = (int) $r->recruits;
        $trainees = (int) $r->trainees;
        $buckets = fn (int $notStarted, int $done) => ['not_started' => $notStarted, 'in_progress' => max(0, $trainees - $notStarted - $done), 'finished' => $done];

        return [
            // Among recruits still in training: NAO 0 / 1–99 / 100%, FIRE 0 / 1–2 / 3+, and both together.
            'nao_status' => $buckets((int) ($r->nao_not_started ?? 0), (int) $r->nao_finished),
            'fire_status' => $buckets((int) ($r->fire_not_started ?? 0), (int) $r->fire_complete),
            'overall_status' => $buckets((int) ($r->no_activity ?? 0), (int) ($r->completed ?? 0)),
            'recruits' => $recruits,
            'sold' => (int) $r->sold,
            'conversion' => $recruits ? round((int) $r->sold / $recruits * 100, 1) : 0.0,
            'value' => (float) $r->value,
            'trainees' => $trainees,
            'nao_finished' => (int) $r->nao_finished,
            'nao' => $trainees ? round((int) $r->nao_finished / $trainees * 100, 1) : 0.0,
            'fire_complete' => (int) $r->fire_complete,
            'fire' => $trainees ? round((int) $r->fire_complete / $trainees * 100, 1) : 0.0,
        ];
    }
}
