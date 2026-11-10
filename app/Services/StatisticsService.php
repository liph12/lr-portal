<?php

namespace App\Services;

use App\Support\DataCache;
use App\Models\Entities\Agent;
use App\Models\Entities\AgentTransaction;
use App\Models\Role;
use App\Models\User;
use App\Support\ClientStats;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class StatisticsService
{
    public const PERIODS = ['12m', 'year', 'all'];

    private const TOP_DEVELOPERS = 5;
    // "All time" charts at most this many months so the column chart stays readable.
    private const MAX_MONTHS = 36;

    /**
     * @return array<string, mixed>
     */
    public function summary(string $period): array
    {
        return DataCache::remember('StatisticsService.summary', [$period], fn () => $this->computeSummary($period));
    }

    private function computeSummary(string $period): array
    {
        [$start, $end] = $this->range($period);
        // The window of equal length that ends the day before this one starts.
        $previous = $start
            ? [$start->subDays((int) $start->diffInDays($end) + 1), $start->subDay()]
            : null;

        $current = $this->sales($start, $end);

        return [
            'period' => $period,
            'range' => ['start' => $start?->toDateString(), 'end' => $end->toDateString()],
            'kpis' => $this->kpis($current, $previous ? $this->sales(...$previous) : null),
            'monthly' => $this->monthly($current, $start, $end),
            'developers' => $this->topDevelopers($start, $end),
            'propertyTypes' => $this->byPropertyType($start, $end),
            'clients' => $this->clients($start, $end),
            'sellerAges' => $this->sellerAges($start, $end),
            'team' => $this->team(),
        ];
    }

    /**
     * @return array{0: ?CarbonImmutable, 1: CarbonImmutable}
     */
    private function range(string $period): array
    {
        $today = CarbonImmutable::today();

        return match ($period) {
            'year' => [$today->startOfYear(), $today],
            'all' => [null, $today],
            default => [$today->subMonths(11)->startOfMonth(), $today],
        };
    }

    // Project sales, dated by reservation date (when the deal happened, not when it was keyed in).
    private function salesQuery(?CarbonImmutable $start, CarbonImmutable $end): Builder
    {
        return Agent::withoutGlobalPartners(DB::table('agent_transactions as t'), 't.agent_id')
            ->join('agent_project_transactions as p', 'p.agent_transaction_id', '=', 't.id')
            ->where('t.sale_type', AgentTransaction::TYPE_PROJECT)
            ->when($start, fn ($q) => $q->where('p.reservation_date', '>=', $start->toDateString()))
            ->where('p.reservation_date', '<=', $end->toDateString());
    }

    /**
     * @return Collection<int, object{reservation_date: string, total_contract_price: float}>
     */
    private function sales(?CarbonImmutable $start, CarbonImmutable $end): Collection
    {
        return $this->salesQuery($start, $end)->get(['p.reservation_date', 'p.total_contract_price', 'p.floor_area']);
    }

    /**
     * @return array<string, mixed>
     */
    private function kpis(Collection $current, ?Collection $previous): array
    {
        $count = $current->count();
        $value = (float) $current->sum('total_contract_price');
        // Blended rate (total value ÷ total floor area), not an average of each sale's own rate — only sales with a
        // floor area recorded count either side.
        $pricePerSqm = function (?Collection $sales) {
            if (! $sales) {
                return null;
            }
            $withArea = $sales->filter(fn ($s) => $s->floor_area > 0);
            $area = (float) $withArea->sum('floor_area');

            return $area > 0 ? (float) $withArea->sum('total_contract_price') / $area : null;
        };

        return [
            'sales' => ['value' => $count, 'previous' => $previous?->count()],
            'contract_value' => ['value' => $value, 'previous' => $previous ? (float) $previous->sum('total_contract_price') : null],
            'average_deal' => [
                'value' => $count ? $value / $count : 0,
                'previous' => $previous && $previous->count() ? (float) $previous->sum('total_contract_price') / $previous->count() : null,
            ],
            'price_per_sqm' => [
                'value' => $pricePerSqm($current) ?? 0.0,
                'previous' => $pricePerSqm($previous),
            ],
            'active_users' => [
                'value' => User::where('status', User::STATUS_ACTIVE)->count(),
                'total' => User::count(),
            ],
        ];
    }

    /**
     * @return array<int, array{month: string, sales: int, value: float}>
     */
    private function monthly(Collection $sales, ?CarbonImmutable $start, CarbonImmutable $end): array
    {
        $first = $start ?? ($sales->min('reservation_date') ? CarbonImmutable::parse($sales->min('reservation_date')) : $end);
        $first = $first->startOfMonth()->max($end->startOfMonth()->subMonths(self::MAX_MONTHS - 1));

        $byMonth = $sales->groupBy(fn ($s) => substr($s->reservation_date, 0, 7));
        $months = [];

        // Every month in range is listed, including empty ones, so gaps read as zero instead of vanishing.
        for ($m = $first; $m <= $end; $m = $m->addMonth()) {
            $key = $m->format('Y-m');
            $rows = $byMonth->get($key, collect());
            $months[] = ['month' => $key, 'sales' => $rows->count(), 'value' => (float) $rows->sum('total_contract_price')];
        }

        return $months;
    }

    /**
     * @return array<int, array{name: string, sales: int, value: float}>
     */
    private function topDevelopers(?CarbonImmutable $start, CarbonImmutable $end): array
    {
        $rows = $this->salesQuery($start, $end)
            ->leftJoin('developers as d', 'd.id', '=', 'p.developer_id')
            ->groupBy('p.developer_id', 'd.name')
            ->selectRaw('d.name as name, COUNT(*) as sales, SUM(p.total_contract_price) as value')
            ->orderByDesc('value')
            ->get();

        $top = $rows->take(self::TOP_DEVELOPERS)->map(fn ($r) => [
            'name' => trim((string) $r->name) ?: 'Unknown developer',
            'sales' => (int) $r->sales,
            'value' => (float) $r->value,
        ]);

        // The tail is folded into one row rather than dropped, so the bars still add up to the total.
        $rest = $rows->slice(self::TOP_DEVELOPERS);
        if ($rest->isNotEmpty()) {
            $top->push(['name' => "Other ({$rest->count()})", 'sales' => (int) $rest->sum('sales'), 'value' => (float) $rest->sum('value')]);
        }

        return $top->values()->all();
    }

    /**
     * Property types with each one's own unit types nested inside (the Statistics page's expandable cards). Sales
     * with no recorded property type / unit type are left out entirely — not shown as "Unspecified".
     *
     * @return array<int, array{id: int, name: string, sales: int, value: float, price_per_sqm: ?float, unit_types: array<int, array{name: string, sales: int, value: float, price_per_sqm: ?float}>}>
     */
    private function byPropertyType(?CarbonImmutable $start, CarbonImmutable $end): array
    {
        // Blended rate (total value ÷ total floor area) per group, like the KPI — only sales with a floor area
        // recorded count either side, never an average of each sale's own rate; null (not 0) when none is recorded.
        $sqm = 'COALESCE(SUM(CASE WHEN p.floor_area > 0 THEN p.total_contract_price ELSE 0 END), 0) as sqm_value, COALESCE(SUM(CASE WHEN p.floor_area > 0 THEN p.floor_area ELSE 0 END), 0) as sqm_area';
        $pricePerSqm = fn ($r) => (float) $r->sqm_area > 0 ? (float) $r->sqm_value / (float) $r->sqm_area : null;

        $types = $this->salesQuery($start, $end)
            ->join('project_property_types as pt', 'pt.id', '=', 'p.project_property_type_id')
            ->groupBy('p.project_property_type_id', 'pt.name')
            ->selectRaw("p.project_property_type_id as id, pt.name as name, COUNT(*) as sales, SUM(p.total_contract_price) as value, {$sqm}")
            ->orderByDesc('sales')
            ->get();

        $unitTypes = [];
        $this->salesQuery($start, $end)
            ->whereNotNull('p.project_property_type_id')
            ->whereRaw("NULLIF(TRIM(p.unit_type), '') IS NOT NULL")
            ->groupByRaw("p.project_property_type_id, NULLIF(TRIM(p.unit_type), '')")
            ->selectRaw("p.project_property_type_id as property_type_id, NULLIF(TRIM(p.unit_type), '') as name, COUNT(*) as sales, SUM(p.total_contract_price) as value, {$sqm}")
            ->orderByDesc('sales')
            ->get()
            ->each(function ($r) use (&$unitTypes, $pricePerSqm) {
                $unitTypes[(int) $r->property_type_id][] = ['name' => $r->name, 'sales' => (int) $r->sales, 'value' => (float) $r->value, 'price_per_sqm' => $pricePerSqm($r)];
            });

        return $types->map(fn ($r) => [
            'id' => (int) $r->id,
            'name' => $r->name,
            'sales' => (int) $r->sales,
            'value' => (float) $r->value,
            'price_per_sqm' => $pricePerSqm($r),
            'unit_types' => $unitTypes[(int) $r->id] ?? [],
        ])->all();
    }

    /**
     * The clients behind the period's project sales: by country, gender and age (believable ages only).
     *
     * @return array{countries: array<int, mixed>, genders: array<int, mixed>, ages: array<string, mixed>}
     */
    private function clients(?CarbonImmutable $start, CarbonImmutable $end): array
    {
        $rows = fn () => $this->salesQuery($start, $end)
            ->leftJoin('agent_transaction_details as cd', 'cd.agent_transaction_id', '=', 't.id')
            ->select('cd.client_country', 'cd.client_gender', 'cd.client_age', 'p.total_contract_price as value');

        return [
            'countries' => ClientStats::countries($rows()),
            'genders' => ClientStats::genders($rows()),
            'ages' => ClientStats::ages($rows()),
        ];
    }

    // The selling agent's age, not the client's.
    private function sellerAges(?CarbonImmutable $start, CarbonImmutable $end): array
    {
        return ClientStats::sellerAges($this->salesQuery($start, $end)
            ->join('agents as sag', 'sag.id', '=', 't.agent_id')
            ->select('t.agent_id', 'sag.birthdate', 'p.reservation_date', 'p.total_contract_price as value'));
    }

    /**
     * @return array<string, mixed>
     */
    private function team(): array
    {
        $byRole = Role::query()
            ->withCount('users')
            ->orderByDesc('users_count')
            ->get(['id', 'label'])
            ->map(fn (Role $role) => ['name' => $role->label, 'users' => $role->users_count])
            ->filter(fn ($r) => $r['users'] > 0)
            ->values()
            ->all();

        $statusCounts = DB::table('users as u')->leftJoin('agents as a', 'a.user_id', '=', 'u.id')
            ->selectRaw(Agent::statusSql().' as status, COUNT(DISTINCT u.id) as users')->groupByRaw(Agent::statusSql())->pluck('users', 'status');

        return [
            'byRole' => $byRole,
            'byStatus' => collect(User::statisticCounts($statusCounts))->map(fn ($n, $s) => ['status' => $s, 'users' => $n])->values()->all(),
        ];
    }
}
