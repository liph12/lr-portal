<?php

namespace App\Services;

use App\Support\DataCache;
use App\Models\Entities\Agent;
use App\Support\Areas;
use App\Support\ClientStats;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

// Sales report across the local categories (project, rental, brokerage) of local agents, dated by reservation
// date; global partners and international sales get statistics of their own. One union of all sales is the
// base; each view groups it differently.
class SalesReportService
{
    public const CATEGORIES = ['project', 'rental', 'brokerage'];

    public const STATUSES = ['valid', 'pending', 'invalid', 'cancelled'];

    // What the breakdown table groups by. Developers / brokerage / rental views only make sense for their category;
    // brokerage and rental rank the agents who made those sales.
    public const VIEWS = ['agents', 'teams', 'sub_teams', 'areas', 'developers', 'brokerage', 'rental', 'unit_managers', 'team_leaders'];


    // Views that rank the members of one role by their own (personal) sales.
    private const ROLE_VIEWS = ['unit_managers' => 'unit_manager', 'team_leaders' => 'team_leader'];

    private const VIEW_CATEGORY = ['developers' => 'project', 'brokerage' => 'brokerage', 'rental' => 'rental'];

    private const PER_PAGE = [25, 50, 100];

    // Longer ranges are charted by year so the chart stays readable.
    private const MAX_MONTH_BUCKETS = 36;

    /**
     * Normalised filters with defaults (this year to today, valid sales, all categories, by agent).
     *
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

        $view = in_array($input['view'] ?? null, self::VIEWS, true) ? $input['view'] : 'agents';
        $category = self::VIEW_CATEGORY[$view]
            ?? ($this->scopeOf($input)['developer_id'] ? 'project' : null)
            ?? (in_array($input['category'] ?? null, self::CATEGORIES, true) ? $input['category'] : null);

        return [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'category' => $category,
            // "all" means every status; the default counts only validated sales, like the leaderboards.
            'status' => ($input['status'] ?? null) === 'all' ? 'all' : (in_array($input['status'] ?? null, self::STATUSES, true) ? $input['status'] : 'valid'),
            'view' => $view,
            'q' => trim((string) ($input['q'] ?? '')) ?: null,
            'sort' => in_array($input['sort'] ?? null, ['name', 'value'], true) ? $input['sort'] : 'value',
            'dir' => ($input['dir'] ?? null) === 'asc' ? 'asc' : 'desc',
            'page' => max(1, (int) ($input['page'] ?? 1)),
            'per_page' => in_array((int) ($input['per_page'] ?? 0), self::PER_PAGE, true) ? (int) $input['per_page'] : self::PER_PAGE[0],
            // Inside a developer: "sales" lists the sales one by one instead of ranking agents.
            'list' => ($input['list'] ?? null) === 'sales' ? 'sales' : null,
            // Drill-down from a team / sub-team / developer row: only that group's sales (one at a time).
            'team_id' => ($scope = $this->scopeOf($input))['team_id'],
            'sub_team_id' => $scope['sub_team_id'],
            'developer_id' => $scope['developer_id'],
            'area' => $scope['area'],
            'agent_id' => $scope['agent_id'],
        ];
    }

    /**
     * The group a drill-down is limited to, with a few facts for the page header; null when not drilled down.
     *
     * @param  array<string, mixed>  $f  normalised filters
     * @return array{type: string, id: int|string, name: string, avatar: ?string, facts: array<int, array{label: string, value: string}>}|null
     */
    public function scope(array $f): ?array
    {
        if ($f['agent_id'] ?? null) {
            $agent = DB::table('agents as a')->leftJoin('users as u', 'u.id', '=', 'a.user_id')->where('a.id', $f['agent_id'])->first(['u.name', 'a.avatar', 'a.area']);

            return ['type' => 'agent', 'id' => $f['agent_id'], 'name' => $agent->name ?? "#{$f['agent_id']}", 'avatar' => $agent->avatar ?? null, 'facts' => [
                ['label' => 'Area', 'value' => ($agent->area ?? null) ? Areas::name($agent->area) : '—'],
            ]];
        }

        // A developer drill-down names the developer (and the area it's narrowed to, if any).
        if ($f['developer_id'] ?? null) {
            return ['type' => 'developer', 'id' => $f['developer_id'], 'name' => (string) (DB::table('developers')->where('id', $f['developer_id'])->value('name') ?? "#{$f['developer_id']}"), 'avatar' => null, 'facts' => [
                ['label' => 'Projects on file', 'value' => number_format(DB::table('developer_projects')->where('developer_id', $f['developer_id'])->count())],
                ...(($f['area'] ?? null) ? [['label' => 'Area', 'value' => Areas::name($f['area'])]] : []),
            ]];
        }

        if ($f['area'] ?? null) {
            $agents = DB::table('agents')->where('agent_type', Agent::TYPE_LOCAL)->whereIn('id', Agent::fullyRegisteredIds())->where('area', $f['area'])->count();

            return ['type' => 'area', 'id' => $f['area'], 'name' => Areas::name($f['area']), 'avatar' => null, 'facts' => [
                ['label' => 'Agents in this area', 'value' => number_format($agents)],
            ]];
        }

        if ($f['team_id'] ?? null) {
            $team = DB::table('teams as g')->leftJoin('agents as l', 'l.id', '=', 'g.agent_id')->leftJoin('users as lu', 'lu.id', '=', 'l.user_id')
                ->where('g.id', $f['team_id'])->first(['g.name', 'g.logo', 'g.status', 'lu.name as leader', 'l.area']);

            return ['type' => 'team', 'id' => $f['team_id'], 'name' => $team->name ?? "#{$f['team_id']}", 'avatar' => $team->logo ?? null, 'facts' => [
                ['label' => 'Team leader', 'value' => $team->leader ?? '—'],
                ['label' => 'Area', 'value' => ($team->area ?? null) ? Areas::name($team->area) : '—'],
                ['label' => 'Active members', 'value' => number_format(DB::table('team_agents')->where('team_id', $f['team_id'])->where('status', 'active')->count())],
                ['label' => 'Status', 'value' => ucfirst((string) ($team->status ?? '—'))],
            ]];
        }

        if ($f['sub_team_id'] ?? null) {
            $sub = DB::table('sub_teams as g')->leftJoin('teams as t', 't.id', '=', 'g.team_id')
                ->leftJoin('agents as l', 'l.id', '=', 'g.agent_id')->leftJoin('users as lu', 'lu.id', '=', 'l.user_id')
                ->where('g.id', $f['sub_team_id'])->first(['g.name', 'g.logo', 't.name as team', 'lu.name as leader', 'l.area']);

            return ['type' => 'sub_team', 'id' => $f['sub_team_id'], 'name' => $sub->name ?? "#{$f['sub_team_id']}", 'avatar' => $sub->logo ?? null, 'facts' => [
                ['label' => 'Team', 'value' => $sub->team ?? '—'],
                ['label' => 'Leader', 'value' => $sub->leader ?? '—'],
                ['label' => 'Area', 'value' => ($sub->area ?? null) ? Areas::name($sub->area) : '—'],
                ['label' => 'Active members', 'value' => number_format(DB::table('sub_team_agents')->where('sub_team_id', $f['sub_team_id'])->where('status', 'active')->count())],
            ]];
        }

        return null;
    }

    /**
     * @return array{team_id: ?int, sub_team_id: ?int, developer_id: ?int, area: ?string, agent_id: ?int}
     */
    // Filters combine: an area's developers, then one developer's agents in that area; or a leader's team + a developer.
    private function scopeOf(array $input): array
    {
        $area = $input['area'] ?? null;
        $scope = ['area' => is_string($area) && array_key_exists($area, config('areas')) ? $area : null];
        foreach (['team_id', 'sub_team_id', 'developer_id', 'agent_id'] as $key) {
            $scope[$key] = (int) ($input[$key] ?? 0) > 0 ? (int) $input[$key] : null;
        }

        return $scope;
    }

    /**
     * The views worth offering for a reach: ranking teams inside one team (or sub-teams inside one sub-team) only
     * ever shows that one group, so those views are left out.
     *
     * @param  array<string, int>|null  $lock
     * @return array<int, string>
     */
    public function viewsFor(?array $lock): array
    {
        $hidden = match (true) {
            isset($lock['team_id']) => ['teams'],
            // A secretary's area: ranking areas would only show their own.
            isset($lock['area']) => ['areas'],
            isset($lock['sub_team_id']), isset($lock['agent_id']) => ['teams', 'sub_teams'],
            default => [],
        };

        return array_values(array_diff(self::VIEWS, $hidden));
    }

    /**
     * Filters from the query string with a forced scope on top: the scope keys in the query are dropped first, so
     * a locked report can't be widened (or pointed at another group) from the URL.
     *
     * @param  array<string, mixed>  $input
     * @param  array<string, int>|null  $lock
     * @return array<string, mixed>
     */
    public function lockedFilters(array $input, ?array $lock): array
    {
        if ($lock === null) {
            return $this->filters($input);
        }

        // A locked reader can't swap their group (team, sub-team, area, own sales) from the URL — it stays their header;
        // drilling into a developer within it is allowed.
        return $this->filters(array_diff_key($input, array_flip(['team_id', 'sub_team_id', 'area', 'agent_id'])) + $lock);
    }

    // Count and value per category for the same filters but every category, so all three totals stay visible while one is picked.
    // Cached until the data changes (DataCache).
    public function categoryTotals(array $f): array
    {
        return DataCache::remember('SalesReportService.categoryTotals', [$f], fn () => $this->computeCategoryTotals($f));
    }

    private function computeCategoryTotals(array $f): array
    {
        $rows = DB::query()->fromSub($this->sales(['category' => null] + $f), 's')
            ->selectRaw('category, COUNT(*) as sales, COALESCE(SUM(value), 0) as value')
            ->groupBy('category')
            ->get()
            ->keyBy('category');

        return array_map(fn (string $c) => [
            'category' => $c,
            'sales' => (int) ($rows[$c]->sales ?? 0),
            'value' => (float) ($rows[$c]->value ?? 0),
        ], self::CATEGORIES);
    }

    /**
     * Headline numbers, the trend over time and the split by category for the filtered range.
     *
     * @param  array<string, mixed>  $f  normalised filters
     * @return array<string, mixed>
     */
    public function summary(array $f): array
    {
        return DataCache::remember('SalesReportService.summary', [$f], fn () => $this->computeSummary($f));
    }

    private function computeSummary(array $f): array
    {
        $from = CarbonImmutable::parse($f['from']);
        $to = CarbonImmutable::parse($f['to']);
        // The same number of days just before, for the comparison on each tile.
        $days = $from->diffInDays($to) + 1;
        $previous = ['from' => $from->subDays($days)->toDateString(), 'to' => $from->subDay()->toDateString()] + $f;

        $totals = fn (array $filters) => DB::query()->fromSub($this->sales($filters), 's')
            ->selectRaw('COUNT(*) as sales, COALESCE(SUM(value), 0) as value, COUNT(DISTINCT agent_id) as agents')
            ->first();
        $now = $totals($f);
        $before = $totals($previous);

        $byYear = $from->diffInMonths($to) >= self::MAX_MONTH_BUCKETS;
        $bucket = $byYear ? 'year' : 'month';

        return [
            'kpis' => [
                'sales' => ['value' => (int) $now->sales, 'previous' => (int) $before->sales],
                'value' => ['value' => (float) $now->value, 'previous' => (float) $before->value],
                'average' => [
                    'value' => $now->sales ? (float) $now->value / $now->sales : 0.0,
                    'previous' => $before->sales ? (float) $before->value / $before->sales : null,
                ],
                'agents' => ['value' => (int) $now->agents, 'previous' => (int) $before->agents],
            ],
            'bucket' => $bucket,
            'trend' => $this->trend($f, $from, $to, $byYear),
            'categories' => DB::query()->fromSub($this->sales($f), 's')
                ->selectRaw('category, COUNT(*) as sales, COALESCE(SUM(value), 0) as value')
                ->groupBy('category')
                ->orderByDesc('value')
                ->get()
                ->map(fn ($r) => ['category' => $r->category, 'sales' => (int) $r->sales, 'value' => (float) $r->value])
                ->all(),
            // Only sales whose agent has an area; the rest aren't shown as an "Unassigned" bar.
            'areas' => DB::query()->fromSub($this->sales($f), 's')
                ->join('agents as aa', 'aa.id', '=', 's.agent_id')
                ->whereNotNull('aa.area')
                ->groupBy('aa.area')
                ->selectRaw('aa.area as area, COUNT(*) as sales, COALESCE(SUM(s.value), 0) as value')
                ->orderByDesc('value')
                ->get()
                ->map(fn ($r) => ['area' => $r->area, 'name' => Areas::name($r->area), 'sales' => (int) $r->sales, 'value' => (float) $r->value])
                ->all(),
            'developers' => $this->topDevelopers($f),
            'client_countries' => ClientStats::countries($this->sales($f)),
            'client_genders' => ClientStats::genders($this->sales($f)),
            'client_ages' => ClientStats::ages($this->sales($f)),
            'property_types' => DB::query()->fromSub($this->sales($f), 's')
                ->leftJoin('project_property_types as pt', 'pt.id', '=', 's.property_type_id')
                ->groupBy('s.property_type_id', 'pt.name')
                ->selectRaw('pt.name as name, COUNT(*) as sales, COALESCE(SUM(s.value), 0) as value')
                ->orderByDesc('value')
                ->get()
                ->map(fn ($r) => ['name' => $r->name ?? 'Not specified', 'sales' => (int) $r->sales, 'value' => (float) $r->value])
                ->all(),
            'comparison' => ['from' => $previous['from'], 'to' => $previous['to']],
        ];
    }

    /**
     * The breakdown table for the current view, paged.
     *
     * @param  array<string, mixed>  $f  normalised filters
     */
    public function breakdown(array $f): LengthAwarePaginator
    {
        return DataCache::page('SalesReportService.breakdown', [$f], fn () => $this->computeBreakdown($f));
    }

    private function computeBreakdown(array $f): LengthAwarePaginator
    {
        $query = $this->grouped($f);

        if ($f['q'] !== null) {
            $query->where('g.name', 'like', '%'.addcslashes($f['q'], '%_\\').'%');
        }
        // A floor on the total (NATCON qualifiers); "+ 0" because SQLite would compare the bound number as text.
        if ($f['min_value'] ?? null) {
            $query->whereRaw('g.value >= (? + 0)', [$f['min_value']]);
        }

        // Areas are stored as keys; show their names and how many agents each has.
        $headcount = $f['view'] === 'areas'
            ? DB::table('agents')->where('agent_type', Agent::TYPE_LOCAL)->whereIn('id', Agent::fullyRegisteredIds())->whereNotNull('area')->selectRaw('area, COUNT(*) as n')->groupBy('area')->pluck('n', 'area')->map(fn ($n) => (int) $n)
            : collect();

        $page = $query
            ->select('g.*')
            ->orderBy($f['sort'], $f['dir'])
            ->orderBy('g.key')
            ->paginate($f['per_page'], ['*'], 'page', $f['page']);

        $context = $this->context($f['view'], collect($page->items()));

        return $page->through(fn ($r) => [
            'id' => $r->key,
            'name' => $f['view'] === 'areas' ? Areas::name($r->key) : ($r->name ?: 'Unknown'),
            'detail' => $f['view'] === 'areas' ? $this->headcountLabel((int) ($headcount[$r->key] ?? 0)) : ($f['view'] === 'sub_teams' ? null : ($r->detail ?? null)),
            'avatar' => $r->avatar ?? null,
            'area' => $context[$r->key]['area'] ?? null,
            'team' => $f['view'] === 'sub_teams' ? ($r->detail ?? null) : ($context[$r->key]['team'] ?? null),
            'value' => (float) $r->value,
        ]);
    }

    // Whether a sale is one of the report's (its filters and the reader's lock): only then may its details be opened.
    public function containsSale(array $f, int $saleId): bool
    {
        return DB::query()->fromSub($this->sales($f), 's')->where('s.sale_id', $saleId)->exists();
    }

    /**
     * The sales behind the report, one row each (newest reservation first): agent, client, project, unit, dates, status.
     * Read-only — used inside a developer drill-down.
     */
    public function saleList(array $f): LengthAwarePaginator
    {
        return DataCache::page('SalesReportService.saleList', [$f], fn () => $this->computeSaleList($f));
    }

    private function computeSaleList(array $f): LengthAwarePaginator
    {
        return DB::query()->fromSub($this->sales($f), 's')
            ->join('agent_transactions as t', 't.id', '=', 's.sale_id')
            ->leftJoin('agent_transaction_details as cd', 'cd.agent_transaction_id', '=', 't.id')
            ->leftJoin('agent_project_transactions as p', 'p.agent_transaction_id', '=', 't.id')
            ->leftJoin('brokerage_areas as ba', 'ba.id', '=', 's.brokerage_area_id')
            ->leftJoin('agents as a', 'a.id', '=', 's.agent_id')
            ->leftJoin('users as u', 'u.id', '=', 'a.user_id')
            ->select('t.id', 's.category', 's.agent_id', 'u.name as agent_name', 'a.avatar as agent_avatar', 'cd.client_first_name', 'cd.client_last_name',
                'p.project_name', 'ba.name as brokerage_area', 't.unit_number', 's.value', 's.reservation_date', 't.created_at', 't.sale_status')
            // The report's search term: agent, client, project or unit.
            ->when($f['q'] !== null && mb_strlen($f['q']) >= 2, function ($q) use ($f) {
                $like = '%'.addcslashes($f['q'], '%_\\').'%';
                $q->where(fn ($w) => $w->where('u.name', 'like', $like)->orWhere('cd.client_first_name', 'like', $like)
                    ->orWhere('cd.client_last_name', 'like', $like)->orWhere('p.project_name', 'like', $like)->orWhere('t.unit_number', 'like', $like));
            })
            ->orderByDesc('s.reservation_date')->orderByDesc('t.id')
            ->paginate($f['per_page'], ['*'], 'page', $f['page'])
            ->through(fn ($r) => [...(array) $r, 'value' => (float) $r->value]);
    }

    /**
     * Every group's total for the current view, unpaged (for small sets such as one team's sub-teams).
     *
     * @param  array<string, mixed>  $f  normalised filters
     * @return array<string|int, float> group key => total sales
     */
    public function totals(array $f): array
    {
        return DataCache::remember('SalesReportService.totals', [$f], fn () => $this->computeTotals($f));
    }

    private function computeTotals(array $f): array
    {
        return $this->grouped($f)->select('g.key', 'g.value')->pluck('value', 'key')->map(fn ($v) => (float) $v)->all();
    }

    /**
     * Where each row on the page belongs: its area, and for people their current team. Looked up for the
     * page only (25–100 rows), not inside the grouping query.
     *
     * @param  \Illuminate\Support\Collection<int, object>  $rows
     * @return array<string|int, array{area: ?string, team?: ?string}>
     */
    private function context(string $view, $rows): array
    {
        $keys = $rows->pluck('key')->filter()->all();
        if (! $keys) {
            return [];
        }

        if (in_array($view, ['agents', 'rental', 'brokerage', 'unit_managers', 'team_leaders'], true)) {
            $areas = DB::table('agents')->whereIn('id', $keys)->pluck('area', 'id');
            $teams = DB::table('team_agents as ta')->join('teams as t', 't.id', '=', 'ta.team_id')
                ->whereIn('ta.agent_id', $keys)->where('ta.status', 'active')->pluck('t.name', 'ta.agent_id');

            return collect($keys)->mapWithKeys(fn ($id) => [$id => [
                'area' => isset($areas[$id]) ? Areas::name($areas[$id]) : null,
                'team' => $teams[$id] ?? null,
            ]])->all();
        }

        // Teams and sub-teams sit in their leader's area.
        if (in_array($view, ['teams', 'sub_teams'], true)) {
            return DB::table($view === 'teams' ? 'teams as g' : 'sub_teams as g')
                ->leftJoin('agents as l', 'l.id', '=', 'g.agent_id')
                ->whereIn('g.id', $keys)
                ->pluck('l.area', 'g.id')
                ->map(fn ($area) => ['area' => $area ? Areas::name($area) : null])
                ->all();
        }

        return [];
    }

    private const TOP_DEVELOPERS = 10;

    /**
     * Project sales by developer, with each one's share of all project sales in the report.
     *
     * @return array{total: float, rows: array<int, array{id: int, name: string, sales: int, value: float, share: float}>}
     */
    private function topDevelopers(array $f): array
    {
        if ($f['category'] !== null && $f['category'] !== 'project') {
            return ['total' => 0.0, 'rows' => []];
        }

        $projectSales = fn () => DB::query()->fromSub($this->sales($f), 's')->where('s.category', 'project');
        $total = (float) $projectSales()->sum('s.value');

        $rows = $projectSales()
            ->leftJoin('developers as dv', 'dv.id', '=', 's.developer_id')
            ->groupBy('s.developer_id', 'dv.name')
            ->selectRaw('s.developer_id as id, dv.name as name, COUNT(*) as sales, COALESCE(SUM(s.value), 0) as value')
            ->orderByDesc('value')
            ->limit(self::TOP_DEVELOPERS)
            ->get()
            ->map(fn ($r) => [
                'id' => (int) $r->id,
                'name' => $r->name ?? 'Unknown developer',
                'sales' => (int) $r->sales,
                'value' => (float) $r->value,
                'share' => $total > 0 ? round((float) $r->value / $total * 100, 1) : 0.0,
            ])
            ->all();

        return ['total' => $total, 'rows' => $rows];
    }

    private function headcountLabel(int $agents): string
    {
        return number_format($agents).($agents === 1 ? ' agent' : ' agents').' in this area';
    }

    // Every sale matching the filters as (category, agent_id, reservation_date, value, …), one row per sale.
    private function sales(array $f): Builder
    {
        $sales = $this->roleScoped($f);

        if ($f['agent_id'] ?? null) {
            $sales = DB::query()->fromSub($sales, 'ag')->where('agent_id', $f['agent_id']);
        }
        if ($f['area'] ?? null) {
            $sales = DB::query()->fromSub($sales, 'ar')->whereIn('agent_id', DB::table('agents')->select('id')->where('area', $f['area']));
        }
        if ($f['developer_id'] ?? null) {
            $sales = DB::query()->fromSub($sales, 'd')->where('developer_id', $f['developer_id']);
        }

        // A team's (sub-team's) sales: those whose agent was on it at the reservation date.
        foreach (['team_id' => ['team_agents', 'team_id'], 'sub_team_id' => ['sub_team_agents', 'sub_team_id']] as $key => [$table, $column]) {
            if ($f[$key] ?? null) {
                $sales = $this->onTeam(DB::query()->fromSub($sales, 's'), $table, $column)
                    ->where("m.{$column}", $f[$key])
                    ->select('s.*');
            }
        }

        return $sales;
    }

    private function roleScoped(array $f): Builder
    {
        if ($role = self::ROLE_VIEWS[$f['view']] ?? null) {
            // Only that role's members' own sales, so the totals and chart describe the same people as the table.
            return DB::query()->fromSub($this->allSales($f), 'u')->whereIn('agent_id', DB::table('agents as a')
                ->join('role_user as ru', 'ru.user_id', '=', 'a.user_id')
                ->join('roles as r', 'r.id', '=', 'ru.role_id')
                ->where('r.name', $role)
                ->select('a.id'));
        }

        return $this->allSales($f);
    }

    private function allSales(array $f): Builder
    {
        $categories = $f['category'] ? [$f['category']] : self::CATEGORIES;
        $branches = [];

        foreach ($categories as $category) {
            $branches[] = $this->localBranch($category, $f);
        }

        $union = array_shift($branches);
        foreach ($branches as $branch) {
            $union->unionAll($branch);
        }

        return $union;
    }

    private function localBranch(string $category, array $f): Builder
    {
        $table = ['project' => 'agent_project_transactions', 'rental' => 'agent_rental_transactions', 'brokerage' => 'agent_brokerage_transactions'][$category];

        $sales = DB::table("{$table} as c")
            ->join('agent_transactions as t', 't.id', '=', 'c.agent_transaction_id')
            // Sales keyed in by back-office staff before agents were linked are credited to the recorder's agent.
            ->leftJoin('agents as ra', 'ra.user_id', '=', 't.recorded_by');

        return Agent::withoutGlobalPartners($sales, 'COALESCE(t.agent_id, ra.id)')
            ->whereBetween('c.reservation_date', [$f['from'], $f['to']])
            ->when($f['status'] !== 'all', fn ($q) => $q->where('t.sale_status', $f['status']))
            // Only sales keyed in by a cutoff (NATCON: the period's last month's cutoff).
            ->when($f['encoded_by'] ?? null, fn ($q, $at) => $q->where('t.created_at', '<=', $at))
            ->selectRaw('? as category', [$category])
            ->selectRaw('COALESCE(t.agent_id, ra.id) as agent_id')
            ->addSelect('t.id as sale_id', 'c.reservation_date', 'c.total_contract_price as value', 'c.project_property_type_id as property_type_id')
            ->selectRaw($category === 'project' ? 'c.developer_id' : 'NULL as developer_id')
            ->selectRaw($category === 'brokerage' ? 'c.brokerage_area_id' : 'NULL as brokerage_area_id')
            ->leftJoin('agent_transaction_details as cd', 'cd.agent_transaction_id', '=', 't.id')
            ->addSelect('cd.client_country', 'cd.client_gender', 'cd.client_age');
    }


    /**
     * @return array<int, array{month: string, sales: int, value: float}>
     */
    private function trend(array $f, CarbonImmutable $from, CarbonImmutable $to, bool $byYear): array
    {
        $bucket = $byYear ? "SUBSTR(CAST(reservation_date AS CHAR), 1, 4)" : "SUBSTR(CAST(reservation_date AS CHAR), 1, 7)";
        $rows = DB::query()->fromSub($this->sales($f), 's')
            ->selectRaw("{$bucket} as bucket, COUNT(*) as sales, COALESCE(SUM(value), 0) as value")
            ->groupByRaw($bucket)
            ->get()
            ->keyBy('bucket');

        // Every bucket in the range, so gaps show as empty columns rather than disappearing.
        $points = [];
        $cursor = $byYear ? $from->startOfYear() : $from->startOfMonth();
        while ($cursor->lte($to)) {
            $key = $cursor->format($byYear ? 'Y' : 'Y-m');
            $row = $rows->get($key);
            $points[] = ['month' => $byYear ? "{$key}-01" : $key, 'sales' => (int) ($row->sales ?? 0), 'value' => (float) ($row->value ?? 0)];
            $cursor = $byYear ? $cursor->addYear() : $cursor->addMonth();
        }

        return $points;
    }

    // One row per group of the current view: key, name, detail, avatar, sales, value.
    private function grouped(array $f): Builder
    {
        $s = fn () => DB::query()->fromSub($this->sales($f), 's');

        $rows = match ($f['view']) {
            'teams' => $this->onTeam($s(), 'team_agents', 'team_id')
                ->join('teams as g0', 'g0.id', '=', 'm.team_id')
                ->groupBy('g0.id', 'g0.name', 'g0.logo')
                ->selectRaw('g0.id as `key`, g0.name as name, NULL as detail, g0.logo as avatar'),
            'sub_teams' => $this->onTeam($s(), 'sub_team_agents', 'sub_team_id')
                ->join('sub_teams as g0', 'g0.id', '=', 'm.sub_team_id')
                ->join('teams as gt', 'gt.id', '=', 'g0.team_id')
                ->groupBy('g0.id', 'g0.name', 'g0.logo', 'gt.name')
                ->selectRaw('g0.id as `key`, g0.name as name, gt.name as detail, g0.logo as avatar'),
            // Agents without an area aren't ranked as an "Unassigned" row.
            'areas' => $s()->join('agents as g0', 'g0.id', '=', 's.agent_id')
                ->whereNotNull('g0.area')
                ->groupBy('g0.area')
                ->selectRaw('g0.area as `key`, g0.area as name, NULL as detail, NULL as avatar'),
            'developers' => $s()->leftJoin('developers as g0', 'g0.id', '=', 's.developer_id')
                ->groupBy('s.developer_id', 'g0.name')
                ->selectRaw('COALESCE(s.developer_id, 0) as `key`, g0.name as name, NULL as detail, NULL as avatar'),
            // Agents, rental and brokerage all rank people; rental / brokerage are just limited to their category.
            default => $s()->leftJoin('agents as g0', 'g0.id', '=', 's.agent_id')
                ->leftJoin('users as gu', 'gu.id', '=', 'g0.user_id')
                ->groupBy('s.agent_id', 'gu.name', 'gu.email', 'g0.avatar')
                ->selectRaw('COALESCE(s.agent_id, 0) as `key`, gu.name as name, gu.email as detail, g0.avatar as avatar'),
        };

        $rows->selectRaw('COUNT(*) as sales, COALESCE(SUM(s.value), 0) as value');

        return DB::query()->fromSub($rows, 'g');
    }

    // The team (or sub-team) the sale's agent was on at the reservation date: the latest stint that had
    // started by then and hadn't ended (same rule as the Top Teams leaderboard).
    private function onTeam(Builder $sales, string $table, string $groupColumn): Builder
    {
        return $sales
            ->join("{$table} as m", function ($join) {
                $join->on('m.agent_id', '=', 's.agent_id')
                    ->where(fn ($q) => $q->whereNull('m.joined_at')->orWhereColumn('m.joined_at', '<=', 's.reservation_date'))
                    ->where(fn ($q) => $q->whereNull('m.transferred_at')->orWhereColumn('m.transferred_at', '>', 's.reservation_date'));
            })
            ->whereNotExists(fn ($q) => $q->from("{$table} as later")
                ->whereColumn('later.agent_id', 'm.agent_id')
                ->whereColumn('later.joined_at', '<=', 's.reservation_date')
                ->where(fn ($q) => $q->whereNull('m.joined_at')
                    ->orWhereColumn('later.joined_at', '>', 'm.joined_at')
                    ->orWhere(fn ($q) => $q->whereColumn('later.joined_at', 'm.joined_at')->whereColumn('later.id', '>', 'm.id'))));
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
