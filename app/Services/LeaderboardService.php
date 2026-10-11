<?php

namespace App\Services;

use App\Models\Entities\Agent;
use App\Models\Entities\AgentTransaction;
use App\Policies\UserPolicy;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class LeaderboardService
{
    public const PERMISSION = 'view_leaderboards';

    // Back-office roles see sale counts and amounts; everyone else sees names in rank order only.
    public const AMOUNT_ROLES = UserPolicy::SEARCH_ROLES;

    private const LIMIT = 10;

    // Only validated sales rank; pending, invalid and cancelled ones never appear.
    private const VALID = 'valid';

    private const SALE_TABLES = ['agent_project_transactions', 'agent_rental_transactions', 'agent_brokerage_transactions'];

    /** @var array<string, ?string> month => cutoff_at */
    private array $cutoffs = [];

    /**
     * This month and last month, newest first. A month counts the sales reserved in it and encoded
     * by its cutoff (`sales_cutoffs`); a month without a cutoff yet is still open.
     *
     * @return array<int, array{month: string, boards: array<string, array<int, array<string, mixed>>>}>
     */
    public function recentMonths(bool $withAmounts = true): array
    {
        $thisMonth = CarbonImmutable::today()->startOfMonth();

        return array_map(fn (CarbonImmutable $month) => [
            'month' => $month->format('Y-m'),
            'cutoff_at' => $this->cutoff($month),
            'boards' => array_map(fn (array $board) => $withAmounts ? $board : $this->namesOnly($board), [
                'agents' => $this->topAgents($month),
                'brokerage' => $this->topAgents($month, ['agent_brokerage_transactions']),
                'projects' => $this->topProjects($month),
                'developers' => $this->topDevelopers($month),
                'teams' => $this->topTeams($month),
            ]),
        ], [$thisMonth, $thisMonth->subMonth()]);
    }

    // Field roles see the ranking but not anyone's sales figures (see AMOUNT_ROLES).
    private function namesOnly(array $board): array
    {
        return array_map(fn (array $entry) => array_diff_key($entry, ['sales' => true, 'value' => true]), $board);
    }

    // Every category (or just the given tables), as one set of (sale, date, amount) rows; the date
    // filter sits inside each branch so MySQL never materialises all ~190k sales just to keep one month.
    private function allSalesIn(CarbonImmutable $month, array $tables = self::SALE_TABLES): Builder
    {
        $range = [$month->toDateString(), $month->endOfMonth()->toDateString()];
        $branches = array_map(fn (string $table) => DB::table($table)
            ->select('agent_transaction_id', 'total_contract_price', 'reservation_date')
            ->whereBetween('reservation_date', $range), $tables);

        $rows = array_shift($branches);
        foreach ($branches as $branch) {
            $rows->unionAll($branch);
        }

        return $this->beforeCutoff(Agent::withoutGlobalPartners(DB::query()
            ->fromSub($rows, 'p')
            ->join('agent_transactions as t', 't.id', '=', 'p.agent_transaction_id')
            ->where('t.sale_status', self::VALID), 't.agent_id'), $month);
    }

    // Projects and developers only exist for project sales.
    private function projectSalesIn(CarbonImmutable $month): Builder
    {
        return $this->beforeCutoff(Agent::withoutGlobalPartners(DB::table('agent_transactions as t'), 't.agent_id')
            ->join('agent_project_transactions as p', 'p.agent_transaction_id', '=', 't.id')
            ->where('t.sale_type', AgentTransaction::TYPE_PROJECT)
            ->where('t.sale_status', self::VALID)
            ->whereBetween('p.reservation_date', [$month->toDateString(), $month->endOfMonth()->toDateString()]), $month);
    }

    // Sales encoded after the month closed don't count for it.
    private function beforeCutoff(Builder $sales, CarbonImmutable $month): Builder
    {
        $cutoff = $this->cutoff($month);

        return $cutoff ? $sales->where('t.created_at', '<=', $cutoff) : $sales;
    }

    private function cutoff(CarbonImmutable $month): ?string
    {
        $key = $month->format('Y-m');

        if (! array_key_exists($key, $this->cutoffs)) {
            $this->cutoffs[$key] = DB::table('sales_cutoffs')->where('month', $key)->value('cutoff_at');
        }

        return $this->cutoffs[$key];
    }

    /**
     * Credited to the sale's agent once sales carry one; until then, to whoever recorded the sale.
     *
     * @return array<int, array<string, mixed>>
     */
    private function topAgents(CarbonImmutable $month, array $tables = self::SALE_TABLES): array
    {
        return $this->allSalesIn($month, $tables)
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
        return $this->projectSalesIn($month)
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
        return $this->projectSalesIn($month)
            ->leftJoin('developers as d', 'd.id', '=', 'p.developer_id')
            ->groupBy('p.developer_id', 'd.name')
            ->selectRaw('d.name as name, COUNT(*) as sales, SUM(p.total_contract_price) as value')
            ->orderByDesc('value')
            ->limit(self::LIMIT)
            ->get()
            ->map(fn ($r) => ['name' => trim((string) $r->name) ?: 'Unknown developer', 'sales' => (int) $r->sales, 'value' => (float) $r->value])
            ->all();
    }

    /**
     * Each sale goes to the team its agent was on when it was reserved: the latest membership that
     * started on or before the reservation date and hadn't ended by then.
     *
     * @return array<int, array<string, mixed>>
     */
    private function topTeams(CarbonImmutable $month): array
    {
        $sales = $this->allSalesIn($month)
            ->leftJoin('agents as ra', 'ra.user_id', '=', 't.recorded_by')
            ->selectRaw('p.total_contract_price, p.reservation_date, COALESCE(t.agent_id, ra.id) as agent_id');

        return DB::query()
            ->fromSub($sales, 's')
            ->join('team_agents as ta', function ($join) {
                $join->on('ta.agent_id', '=', 's.agent_id')
                    ->where(fn ($q) => $q->whereNull('ta.joined_at')->orWhereColumn('ta.joined_at', '<=', 's.reservation_date'))
                    ->where(fn ($q) => $q->whereNull('ta.transferred_at')->orWhereColumn('ta.transferred_at', '>', 's.reservation_date'));
            })
            ->whereNotExists(fn ($q) => $q->from('team_agents as later')
                ->whereColumn('later.agent_id', 'ta.agent_id')
                ->whereColumn('later.joined_at', '<=', 's.reservation_date')
                ->where(fn ($q) => $q->whereNull('ta.joined_at')
                    ->orWhereColumn('later.joined_at', '>', 'ta.joined_at')
                    ->orWhere(fn ($q) => $q->whereColumn('later.joined_at', 'ta.joined_at')->whereColumn('later.id', '>', 'ta.id'))))
            ->join('teams as tm', 'tm.id', '=', 'ta.team_id')
            ->groupBy('tm.id', 'tm.name', 'tm.logo')
            ->selectRaw('tm.id as id, tm.name as name, tm.logo as avatar, COUNT(*) as sales, SUM(s.total_contract_price) as value')
            ->orderByDesc('value')
            ->limit(self::LIMIT)
            ->get()
            ->map(fn ($r) => ['id' => (int) $r->id, 'name' => trim((string) $r->name) ?: 'Unnamed team', 'avatar' => $r->avatar, 'sales' => (int) $r->sales, 'value' => (float) $r->value])
            ->all();
    }
}
