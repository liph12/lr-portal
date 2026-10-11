<?php

namespace App\Services;

use App\Models\Entities\AgentTransaction;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class LeaderboardService
{
    public const PERMISSION = 'view_leaderboards';

    private const LIMIT = 5;

    /**
     * This month and last month, newest first.
     *
     * @return array<int, array{month: string, boards: array<string, array<int, array<string, mixed>>>}>
     */
    public function recentMonths(): array
    {
        $thisMonth = CarbonImmutable::today()->startOfMonth();

        return array_map(fn (CarbonImmutable $month) => [
            'month' => $month->format('Y-m'),
            'boards' => [
                'agents' => $this->topAgents($month),
                'projects' => $this->topProjects($month),
                'developers' => $this->topDevelopers($month),
            ],
        ], [$thisMonth, $thisMonth->subMonth()]);
    }

    private function salesIn(CarbonImmutable $month): Builder
    {
        return DB::table('agent_transactions as t')
            ->join('agent_project_transactions as p', 'p.agent_transaction_id', '=', 't.id')
            ->where('t.sale_type', AgentTransaction::TYPE_PROJECT)
            ->whereBetween('p.reservation_date', [$month->toDateString(), $month->endOfMonth()->toDateString()]);
    }

    /**
     * Credited to the sale's agent once sales carry one; until then, to whoever recorded the sale.
     *
     * @return array<int, array<string, mixed>>
     */
    private function topAgents(CarbonImmutable $month): array
    {
        return $this->salesIn($month)
            ->leftJoin('agents as a', 'a.id', '=', 't.agent_id')
            ->join('users as u', 'u.id', '=', DB::raw('COALESCE(a.user_id, t.recorded_by)'))
            ->leftJoin('agents as ua', 'ua.user_id', '=', 'u.id')
            ->groupBy('u.id', 'u.name', 'ua.avatar')
            ->selectRaw('u.id as id, u.name as name, ua.avatar as avatar, COUNT(*) as sales, SUM(p.total_contract_price) as value')
            ->orderByDesc('value')
            ->limit(self::LIMIT)
            ->get()
            ->map(fn ($r) => ['id' => (int) $r->id, 'name' => $r->name, 'avatar' => $r->avatar, 'sales' => (int) $r->sales, 'value' => (float) $r->value])
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function topProjects(CarbonImmutable $month): array
    {
        // Grouped by the name snapshot, so typed-in (unlisted) projects rank alongside catalogue ones.
        return $this->salesIn($month)
            ->groupBy('p.project_name')
            ->selectRaw('p.project_name as name, COUNT(*) as sales, SUM(p.total_contract_price) as value')
            ->orderByDesc('value')
            ->limit(self::LIMIT)
            ->get()
            ->map(fn ($r) => ['name' => trim((string) $r->name) ?: 'Unnamed project', 'sales' => (int) $r->sales, 'value' => (float) $r->value])
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function topDevelopers(CarbonImmutable $month): array
    {
        return $this->salesIn($month)
            ->leftJoin('developers as d', 'd.id', '=', 'p.developer_id')
            ->groupBy('p.developer_id', 'd.name')
            ->selectRaw('d.name as name, COUNT(*) as sales, SUM(p.total_contract_price) as value')
            ->orderByDesc('value')
            ->limit(self::LIMIT)
            ->get()
            ->map(fn ($r) => ['name' => trim((string) $r->name) ?: 'Unknown developer', 'sales' => (int) $r->sales, 'value' => (float) $r->value])
            ->all();
    }
}
