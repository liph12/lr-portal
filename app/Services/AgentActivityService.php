<?php

namespace App\Services;

use App\Models\Entities\Agent;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

// Sets agents.activity: dormant when activated (else signed up) over 6 months ago and no sale reserved in the last
// 6 months — a rolling window, so a new sale makes them active again. Valid and pending sales count (a just-recorded
// sale is pending); invalid and cancelled don't. Roles in Agent::ACTIVITY_EXEMPT_ROLES are always active.
class AgentActivityService
{
    private const SALE_TABLES = ['agent_project_transactions', 'agent_rental_transactions', 'agent_brokerage_transactions'];

    private const COUNTED_STATUSES = ['valid', 'pending'];

    /**
     * @param  int[]|null  $agentIds  only these agents (after a sale), or everyone (daily)
     * @return array{active: int, dormant: int}
     */
    public function refresh(?array $agentIds = null): array
    {
        $scoped = fn () => DB::table('agents')->when($agentIds !== null, fn ($q) => $q->whereIn('id', $agentIds));

        DB::transaction(function () use ($scoped) {
            $scoped()->where('activity', '!=', Agent::ACTIVITY_ACTIVE)->update(['activity' => Agent::ACTIVITY_ACTIVE]);
            $this->dormant($scoped())->update(['activity' => Agent::ACTIVITY_DORMANT]);
        });

        $counts = $scoped()->selectRaw('activity, COUNT(*) as n')->groupBy('activity')->pluck('n', 'activity');

        return ['active' => (int) ($counts[Agent::ACTIVITY_ACTIVE] ?? 0), 'dormant' => (int) ($counts[Agent::ACTIVITY_DORMANT] ?? 0)];
    }

    /**
     * Each agent's 6-month window: it starts at activation (else sign-up) or the latest valid/pending sale, whichever is
     * later, and runs DORMANT_AFTER_MONTHS. Exempt roles never run out.
     *
     * @param  int[]  $agentIds
     * @return array<int, array{activated_at: ?string, last_sale: ?string, ends_on: ?string, days_left: ?int, exempt: bool}>
     */
    public function windows(array $agentIds): array
    {
        if (! $agentIds) {
            return [];
        }

        $agents = DB::table('agents')->whereIn('id', $agentIds)->get(['id', 'user_id', 'activated_at', 'created_at'])->keyBy('id');
        $exempt = DB::table('role_user as ru')->join('roles as r', 'r.id', '=', 'ru.role_id')
            ->whereIn('ru.user_id', $agents->pluck('user_id')->filter())->whereIn('r.name', Agent::ACTIVITY_EXEMPT_ROLES)
            ->pluck('ru.user_id')->flip();

        $branches = array_map(fn ($table) => DB::table('agent_transactions as t')->join("{$table} as c", 'c.agent_transaction_id', '=', 't.id')
            ->whereIn('t.agent_id', $agentIds)->whereIn('t.sale_status', self::COUNTED_STATUSES)->select('t.agent_id', 'c.reservation_date'), self::SALE_TABLES);
        $branches[] = DB::table('international_sales')->whereIn('agent_id', $agentIds)->whereIn('sale_status', self::COUNTED_STATUSES)->select('agent_id', 'reservation_date');
        $union = array_shift($branches);
        foreach ($branches as $b) {
            $union->unionAll($b);
        }
        $lastSale = DB::query()->fromSub($union, 's')->groupBy('agent_id')->selectRaw('agent_id, MAX(reservation_date) as d')->pluck('d', 'agent_id');

        $today = now()->startOfDay();

        return $agents->map(function ($a) use ($exempt, $lastSale, $today) {
            $activated = $a->activated_at ?? $a->created_at;
            $sale = $lastSale[$a->id] ?? null;
            $start = collect([$activated, $sale])->filter()->max();
            $isExempt = isset($exempt[$a->user_id]);
            $ends = $start && ! $isExempt ? Carbon::parse($start)->addMonths(Agent::DORMANT_AFTER_MONTHS)->startOfDay() : null;

            return [
                'activated_at' => $a->activated_at ? substr((string) $a->activated_at, 0, 10) : null,
                'last_sale' => $sale ? substr((string) $sale, 0, 10) : null,
                'ends_on' => $ends?->toDateString(),
                // Negative once it has run out (dormant for that many days).
                'days_left' => $ends ? (int) $today->diffInDays($ends, false) : null,
                'exempt' => $isExempt,
            ];
        })->all();
    }

    // How many would change, without saving (for --dry-run).
    public function preview(): array
    {
        $dormant = $this->dormant(DB::table('agents'));

        return [
            'dormant' => (clone $dormant)->count(),
            'becoming_dormant' => (clone $dormant)->where('activity', Agent::ACTIVITY_ACTIVE)->count(),
            'becoming_active' => DB::table('agents')->where('activity', Agent::ACTIVITY_DORMANT)->whereNotIn('id', $this->dormant(DB::table('agents'))->select('id'))->count(),
        ];
    }

    private function dormant(Builder $agents): Builder
    {
        $since = now()->subMonths(Agent::DORMANT_AFTER_MONTHS);

        return $agents
            ->whereRaw('COALESCE(agents.activated_at, agents.created_at) < ?', [$since->toDateTimeString()])
            ->whereNotExists(fn ($q) => $q->from('role_user as ru')->join('roles as r', 'r.id', '=', 'ru.role_id')
                ->whereColumn('ru.user_id', 'agents.user_id')->whereIn('r.name', Agent::ACTIVITY_EXEMPT_ROLES))
            ->where(function ($q) use ($since) {
                foreach (self::SALE_TABLES as $table) {
                    $q->whereNotExists(fn ($s) => $s->from('agent_transactions as t')->join("{$table} as c", 'c.agent_transaction_id', '=', 't.id')
                        ->whereColumn('t.agent_id', 'agents.id')->whereIn('t.sale_status', self::COUNTED_STATUSES)
                        ->where('c.reservation_date', '>=', $since->toDateString()));
                }
                $q->whereNotExists(fn ($s) => $s->from('international_sales as i')->whereColumn('i.agent_id', 'agents.id')
                    ->whereIn('i.sale_status', self::COUNTED_STATUSES)->where('i.reservation_date', '>=', $since->toDateString()));
            });
    }
}
