<?php

namespace App\Services;

use App\Models\Entities\Agent;
use App\Models\Entities\AgentTransaction;
use App\Models\Role;
use App\Models\User;
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
            'commission' => $this->byCommissionStatus($start, $end),
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
        return $this->salesQuery($start, $end)->get(['p.reservation_date', 'p.total_contract_price']);
    }

    /**
     * @return array<string, mixed>
     */
    private function kpis(Collection $current, ?Collection $previous): array
    {
        $count = $current->count();
        $value = (float) $current->sum('total_contract_price');

        return [
            'sales' => ['value' => $count, 'previous' => $previous?->count()],
            'contract_value' => ['value' => $value, 'previous' => $previous ? (float) $previous->sum('total_contract_price') : null],
            'average_deal' => [
                'value' => $count ? $value / $count : 0,
                'previous' => $previous && $previous->count() ? (float) $previous->sum('total_contract_price') / $previous->count() : null,
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
     * @return array<int, array{name: string, sales: int, value: float}>
     */
    private function byPropertyType(?CarbonImmutable $start, CarbonImmutable $end): array
    {
        return $this->salesQuery($start, $end)
            ->leftJoin('project_property_types as pt', 'pt.id', '=', 'p.project_property_type_id')
            ->groupBy('p.project_property_type_id', 'pt.name')
            ->selectRaw('pt.name as name, COUNT(*) as sales, SUM(p.total_contract_price) as value')
            ->orderByDesc('sales')
            ->get()
            ->map(fn ($r) => ['name' => $r->name ?? 'Unspecified', 'sales' => (int) $r->sales, 'value' => (float) $r->value])
            ->all();
    }

    /**
     * @return array<int, array{status: string, sales: int}>
     */
    private function byCommissionStatus(?CarbonImmutable $start, CarbonImmutable $end): array
    {
        $counts = $this->salesQuery($start, $end)
            ->groupBy('t.commission_status')
            ->selectRaw('t.commission_status as status, COUNT(*) as sales')
            ->pluck('sales', 'status');

        // Fixed order so each status keeps its colour across periods.
        return collect(['Unclaimed', 'Partially Claimed', 'Fully Claimed'])
            ->map(fn ($status) => ['status' => $status, 'sales' => (int) ($counts[$status] ?? 0)])
            ->all();
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

        $statusCounts = User::query()->groupBy('status')->selectRaw('status, COUNT(*) as users')->pluck('users', 'status');

        return [
            'byRole' => $byRole,
            'byStatus' => collect(User::STATUSES)->map(fn ($s) => ['status' => $s, 'users' => (int) ($statusCounts[$s] ?? 0)])->all(),
        ];
    }
}
