<?php

namespace App\Services;

use App\Models\Entities\Agent;
use App\Mail\RecruitAnalysisReport;
use App\Models\User;
use App\Support\DataCache;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Throwable;

// Recruits Progress › AI analysis of one team or sub-team. The numbers (old vs new agents' contribution, the monthly sales, a
// three-month forecast, the target that doubles sales) are worked out here; OpenAI only writes the reading of them and the
// strategies, from group totals — never a person's name or details.
class RecruitAnalysisService
{
    public const PERMISSION = 'report_recruits_ai_analysis';

    // Emailing it to the group's leader: no role has it, so only the superadmin sends.
    public const SEND_PERMISSION = 'send_recruits_ai_report';

    // Answers are kept a day per set of numbers; misses are limited per reader (each is a paid call).
    private const CACHE_HOURS = 24;

    private const PER_HOUR = 20;

    private const TREND_MONTHS = 12;

    // Part of the answer cache key: raise it whenever the prompt changes, or day-old answers in the old style keep coming back.
    private const PROMPT_VERSION = 5;

    public function __construct(private RecruitProgressService $progress, private SalesReportService $reports, private OpenAiClient $ai, private ActivityLogger $log) {}

    // The group the analysis is about: a selected (or locked) team or sub-team, never a sponsor's recruits or a branch.
    public static function groupOf(?array $scope): ?array
    {
        if (isset($scope['sub_team_id'])) {
            return ['type' => 'sub_team', 'id' => (int) $scope['sub_team_id']];
        }

        return isset($scope['team_id']) ? ['type' => 'team', 'id' => (int) $scope['team_id']] : null;
    }

    /**
     * @param  array<string, mixed>  $f  Recruits Progress filters (from, to)
     * @param  array<string, mixed>  $scope
     * @param  array<string, mixed>  $kpis  the page's summary KPIs for the same selection
     * @return array<string, mixed>
     */
    public function analyze(array $f, array $scope, array $kpis, User $reader): array
    {
        $group = self::groupOf($scope);
        $facts = $this->facts($f, $scope, $kpis, $group);
        $result = ['group' => $group, 'facts' => $facts, 'ai' => null, 'error' => null, 'model' => $this->ai->model()];

        if (! $this->ai->configured()) {
            return [...$result, 'error' => 'The AI analysis isn\'t set up yet (OPENAI_API_KEY). The numbers below are still exact.'];
        }

        $key = 'recruit-analysis:'.md5(json_encode([$facts, $this->ai->model(), self::PROMPT_VERSION]));
        if ($cached = Cache::get($key)) {
            return [...$result, 'ai' => $this->wording($cached)];
        }
        if (! RateLimiter::attempt("recruit-analysis:{$reader->id}", self::PER_HOUR, fn () => true, 3600)) {
            return [...$result, 'error' => 'That\'s a lot of analyses in an hour — please try again a little later.'];
        }

        try {
            // A written analysis takes 10–40 s; PHP's usual 30 s limit would cut it off.
            set_time_limit(150);
            $ai = [...$this->wording($this->ask($facts, $group['type'] === 'team' ? 'team' : 'sub-team')), 'generated_at' => now()->toIso8601String()];
            // Ranked by impact whatever order they came in (stable within a level).
            $rank = ['high' => 0, 'medium' => 1, 'low' => 2];
            $strategies = array_slice($ai['strategies'], 0, 10);
            usort($strategies, fn ($a, $b) => ($rank[$a['impact']] ?? 3) <=> ($rank[$b['impact']] ?? 3));
            $ai['strategies'] = $strategies;
            Cache::put($key, $ai, now()->addHours(self::CACHE_HOURS));

            return [...$result, 'ai' => $ai];
        } catch (Throwable $e) {
            Log::warning('Recruit analysis failed', ['error' => $e->getMessage()]);

            return [...$result, 'error' => 'The AI analysis couldn\'t be written just now. The numbers below are still exact — try again in a moment.'];
        }
    }

    /**
     * A last guard on the house vocabulary: "made / delivered / generated ₱X" becomes "had sales of ₱X" in every text of the answer.
     *
     * @param  array<string, mixed>  $answer
     * @return array<string, mixed>
     */
    private function wording(array $answer): array
    {
        array_walk_recursive($answer, function (&$value) {
            if (is_string($value)) {
                // A subscript digit where an amount starts is a garbled "₱" + digit (seen once: "₄89M" for "₱489M").
                $value = preg_replace_callback('/(?<![^\s(])([₀-₉])/u', fn ($d) => '₱'.(mb_ord($d[1]) - 0x2080), $value);
                $value = preg_replace_callback('/[₀-₉]/u', fn ($d) => (string) (mb_ord($d[0]) - 0x2080), $value);
                $value = preg_replace('/\b(?:made|booked|generated|produced|delivered|drove|brought in|contributed)\s+(only\s+|about\s+|nearly\s+|just\s+)?(?=₱)/u', 'had sales of $1', $value);
                $value = preg_replace('/\boutput\b/u', 'sales', $value);
            }
        });

        return $answer;
    }

    /**
     * The group's leader, who the report is emailed to: the team leader, or a sub-team's unit manager.
     *
     * @param  array{type: string, id: int}  $group
     * @return array{name: string, email: string, role: string, group: string}|null
     */
    public function recipient(array $group): ?array
    {
        $table = $group['type'] === 'team' ? 'teams' : 'sub_teams';
        $row = DB::table("{$table} as g")
            ->join('agents as a', 'a.id', '=', 'g.agent_id')
            ->leftJoin('users as u', 'u.id', '=', 'a.user_id')
            ->where('g.id', $group['id'])
            ->first(['g.name as group_name', 'a.first_name', 'a.last_name', 'a.email as agent_email', 'u.email as user_email', 'u.name as user_name']);
        $email = trim((string) ($row?->user_email ?: $row?->agent_email));
        if (! $row || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return null;
        }
        $name = trim(ucwords(strtolower(trim("{$row->first_name} {$row->last_name}")))) ?: (string) $row->user_name;

        return ['name' => $name, 'email' => $email, 'role' => $group['type'] === 'team' ? 'Team leader' : 'Unit manager', 'group' => trim((string) $row->group_name)];
    }

    // Who "Send report" can choose: the superadmins only, or the group's leader with the superadmins copied.
    public const AUDIENCES = ['superadmins', 'all'];

    /**
     * What the send dialog offers: the leader (null without an email) and how many superadmins get it.
     *
     * @param  array{type: string, id: int}  $group
     * @return array{leader: array{name: string, email: string, role: string, group: string}|null, superadmins: int}
     */
    public function audience(array $group): array
    {
        return ['leader' => $this->recipient($group), 'superadmins' => count($this->superadmins())];
    }

    /**
     * Active superadmins with an email.
     *
     * @return array<int, array{name: string, email: string}>
     */
    private function superadmins(): array
    {
        return User::whereHas('roles', fn ($q) => $q->where('name', 'superadmin'))
            ->where('status', User::STATUS_ACTIVE)
            ->get(['name', 'email'])
            ->filter(fn ($u) => filter_var($u->email, FILTER_VALIDATE_EMAIL))
            ->map(fn ($u) => ['name' => (string) $u->name, 'email' => (string) $u->email])
            ->values()
            ->all();
    }

    /**
     * Emails the analysis — to the superadmins only, or to the group's leader with every superadmin copied (the sender is one) —
     * sent now, so the sender learns at once if it failed.
     *
     * @return array{sent: bool, message: string}
     */
    public function send(array $f, array $scope, array $kpis, User $sender, string $audience): array
    {
        $group = self::groupOf($scope);
        if (! $group) {
            return ['sent' => false, 'message' => 'Open a team or sub-team to send its analysis.'];
        }
        $leader = $this->recipient($group);
        $admins = $this->superadmins();
        if ($audience === 'all' && ! $leader) {
            return ['sent' => false, 'message' => 'This group\'s leader has no email address on file. Send it to the superadmins only instead.'];
        }
        if ($audience === 'superadmins' && ! $admins) {
            return ['sent' => false, 'message' => 'No active superadmin has an email address, so nothing was sent.'];
        }
        $analysis = $this->analyze($f, $scope, $kpis, $sender);
        if (! $analysis['ai']) {
            return ['sent' => false, 'message' => $analysis['error'] ?? 'The analysis isn\'t ready, so nothing was sent.'];
        }

        $groupName = $leader['group'] ?? (string) DB::table($group['type'] === 'team' ? 'teams' : 'sub_teams')->where('id', $group['id'])->value('name');
        $url = url('/reports/recruits-progress?'.http_build_query(['from' => $f['from'], 'to' => $f['to'], $group['type'].'_id' => $group['id']]));
        // The leader is greeted by name; the superadmins' own copy says the leader didn't get it.
        $mail = new RecruitAnalysisReport(['group' => $groupName, 'leader' => $leader, 'audience' => $audience], $analysis, $url, $sender->name);

        try {
            $audience === 'all'
                ? Mail::to($leader['email'], $leader['name'])->cc(array_map(fn ($a) => new Address($a['email'], $a['name']), $admins))->send($mail)
                : Mail::to(array_map(fn ($a) => new Address($a['email'], $a['name']), $admins))->send($mail);
        } catch (Throwable $e) {
            Log::warning('Recruit analysis email failed', ['error' => $e->getMessage()]);

            return ['sent' => false, 'message' => 'The email couldn\'t be sent just now. Please try again in a moment.'];
        }

        $who = $audience === 'all' ? "{$leader['name']} and the superadmins" : 'the superadmins';
        $this->log->describe('report.analysis_sent', "Sent the Recruits Progress AI analysis of {$groupName} to {$who}", null, [
            'group' => $group, 'audience' => $audience, 'to' => $audience === 'all' ? $leader['email'] : null, 'superadmins' => count($admins),
            'from' => $f['from'], 'until' => $f['to'],
        ]);
        $admins = count($admins).' superadmin'.(count($admins) === 1 ? '' : 's');

        return ['sent' => true, 'message' => $audience === 'all'
            ? "Report sent to {$leader['name']} ({$leader['email']}), with a copy to {$admins}."
            : "Report sent to {$admins} only — not to the leader."];
    }

    /**
     * @return array<string, mixed>
     */
    private function facts(array $f, array $scope, array $kpis, array $group): array
    {
        return DataCache::remember('RecruitAnalysisService.facts', [$f['from'], $f['to'], $scope, $group, $kpis], fn () => $this->computeFacts($f, $scope, $kpis, $group));
    }

    /**
     * @return array<string, mixed>
     */
    private function computeFacts(array $f, array $scope, array $kpis, array $group): array
    {
        $recruits = array_flip($this->progress->recruitIds($f, $scope));

        // Whole months only: a month still running would read as a slump.
        $to = CarbonImmutable::parse($f['to']);
        $last = $to->isLastOfMonth() ? $to->startOfMonth() : $to->startOfMonth()->subMonth();
        $first = $last->subMonths(self::TREND_MONTHS - 1);

        // One pass over the group's sales for the range and the trend months together; old / new is split here.
        $rows = $this->reports->byMonthAndAgent($this->reports->filters([
            'from' => min($f['from'], $first->toDateString()),
            'to' => $f['to'],
            'status' => 'valid',
            $group['type'].'_id' => $group['id'],
        ]), $f['from']);

        $range = ['total' => 0.0, 'new' => 0.0, 'sales' => 0, 'new_sales' => 0, 'sellers' => [], 'new_sellers' => []];
        $months = [];
        foreach ($rows as $r) {
            $isNew = isset($recruits[$r['agent_id']]);
            if ($r['recent']) {
                $range['total'] += $r['value'];
                $range['sales'] += $r['sales'];
                $range[$isNew ? 'new_sellers' : 'sellers'][$r['agent_id']] = true;
                if ($isNew) {
                    $range['new'] += $r['value'];
                    $range['new_sales'] += $r['sales'];
                }
            }
            $months[$r['month']]['sales'] = ($months[$r['month']]['sales'] ?? 0) + $r['sales'];
            $months[$r['month']]['value'] = ($months[$r['month']]['value'] ?? 0) + $r['value'];
            $months[$r['month']]['new_value'] = ($months[$r['month']]['new_value'] ?? 0) + ($isNew ? $r['value'] : 0);
            $months[$r['month']]['agents'][$r['agent_id']] = true;
        }

        $monthly = [];
        for ($m = $first; $m->lte($last); $m = $m->addMonth()) {
            $row = $months[$m->format('Y-m')] ?? [];
            $monthly[] = [
                'month' => $m->format('Y-m'),
                'sales' => (int) ($row['sales'] ?? 0),
                'value' => round((float) ($row['value'] ?? 0), 2),
                'new_value' => round((float) ($row['new_value'] ?? 0), 2),
                'sellers' => count($row['agents'] ?? []),
            ];
        }

        $members = $this->members($group);
        $newMembers = (int) $kpis['recruits'];
        $recent = collect($monthly)->take(-3);
        $baseline = round($recent->avg('value') ?? 0, 2);
        // What doubling takes in people: at the last 3 months' value per seller, how many sellers a month reach the target.
        $sellerMonths = $recent->sum('sellers');
        $perSeller = $sellerMonths > 0 ? $recent->sum('value') / $sellerMonths : 0.0;

        return [
            'range' => ['from' => $f['from'], 'to' => $f['to']],
            'members' => ['total' => $members, 'new' => $newMembers, 'old' => max(0, $members - $newMembers)],
            'contribution' => [
                'total' => round($range['total'], 2),
                'sales' => $range['sales'],
                'old' => $this->side($range['total'] - $range['new'], $range['total'], $range['sales'] - $range['new_sales'], count($range['sellers']), max(0, $members - $newMembers)),
                'new' => $this->side($range['new'], $range['total'], $range['new_sales'], count($range['new_sellers']), $newMembers),
            ],
            'recruits' => [
                'signed_up' => $newMembers,
                'sold' => (int) $kpis['sold'],
                'conversion_pct' => (float) $kpis['conversion'],
                'in_training' => (int) $kpis['trainees'],
                'nao' => ['finished_pct' => (float) $kpis['nao'], ...$kpis['nao_status']],
                'fire' => ['complete_pct' => (float) $kpis['fire'], ...$kpis['fire_status']],
            ],
            'monthly' => $monthly,
            'forecast' => $this->forecast($monthly),
            'double' => ['baseline_monthly' => $baseline, 'target_monthly' => round($baseline * 2, 2), 'target_quarter' => round($baseline * 6, 2)],
            'capacity' => [
                'sellers_per_month' => round($sellerMonths / 3, 1),
                'value_per_seller_month' => round($perSeller, 2),
                'sellers_needed' => $perSeller > 0 ? (int) ceil($baseline * 2 / $perSeller) : null,
            ],
        ];
    }

    /**
     * @return array{value: float, share_pct: float, sales: int, sellers: int, agents: int, productivity_pct: float, per_seller: float}
     */
    private function side(float $value, float $total, int $sales, int $sellers, int $agents): array
    {
        return [
            'value' => round($value, 2),
            'share_pct' => $total > 0 ? round($value / $total * 100, 1) : 0.0,
            'sales' => $sales,
            'sellers' => $sellers,
            'agents' => $agents,
            // Agents who made a valid sale in the range, of the side's members (sellers may have left since).
            'productivity_pct' => $agents > 0 ? round(min($sellers, $agents) / $agents * 100, 1) : 0.0,
            'per_seller' => $sellers > 0 ? round($value / $sellers, 2) : 0.0,
        ];
    }

    // Fully registered local agents on the group now.
    private function members(array $group): int
    {
        [$table, $column] = $group['type'] === 'team' ? ['team_agents', 'team_id'] : ['sub_team_agents', 'sub_team_id'];

        return DB::table("{$table} as m")
            ->join('agents as a', 'a.id', '=', 'm.agent_id')
            ->join('agent_attributes as at', 'at.agent_id', '=', 'a.id')
            ->where("m.{$column}", $group['id'])
            ->where('m.status', 'active')
            ->where('at.registration_status', Agent::FULLY_REGISTERED)
            ->where('a.agent_type', Agent::TYPE_LOCAL)
            ->distinct()
            ->count('a.id');
    }

    /**
     * The next three months: half the straight-line trend of the last twelve, half the last six months' average (so one big
     * month doesn't swing it), never below zero; the band is one standard deviation of the months around the line.
     *
     * @param  array<int, array{month: string, value: float}>  $monthly
     * @return array<int, array{month: string, value: float, low: float, high: float}>
     */
    private function forecast(array $monthly): array
    {
        $values = array_column($monthly, 'value');
        $n = count($values);
        $meanX = ($n - 1) / 2;
        $meanY = array_sum($values) / max($n, 1);
        $sxx = 0.0;
        $sxy = 0.0;
        foreach ($values as $x => $y) {
            $sxx += ($x - $meanX) ** 2;
            $sxy += ($x - $meanX) * ($y - $meanY);
        }
        $slope = $sxx > 0 ? $sxy / $sxx : 0.0;
        $intercept = $meanY - $slope * $meanX;
        $residual = 0.0;
        foreach ($values as $x => $y) {
            $residual += ($y - ($intercept + $slope * $x)) ** 2;
        }
        $spread = sqrt($residual / max($n - 2, 1));
        $recent = array_sum(array_slice($values, -6)) / max(min($n, 6), 1);

        $next = CarbonImmutable::parse(end($monthly)['month'].'-01');
        $points = [];
        for ($i = 1; $i <= 3; $i++) {
            $value = max(0.0, (($intercept + $slope * ($n - 1 + $i)) + $recent) / 2);
            $points[] = [
                'month' => $next->addMonths($i)->format('Y-m'),
                'value' => round($value, 2),
                'low' => round(max(0.0, $value - $spread), 2),
                'high' => round($value + $spread, 2),
            ];
        }

        return $points;
    }

    /**
     * The facts as the model reads them: pesos in millions to one decimal, series as rows, no labels repeated — about a third of
     * the tokens of the full facts, for the same picture.
     *
     * @param  array<string, mixed>  $facts
     * @return array<string, mixed>
     */
    private function brief(array $facts, string $groupType): array
    {
        $m = fn (float $v) => round($v / 1_000_000, 1);
        $side = fn (array $s) => [$m($s['value']), $s['share_pct'], $s['sales'], $s['sellers'], $s['agents'], $s['productivity_pct'], $m($s['per_seller'])];
        $r = $facts['recruits'];
        $of = fn (int $n) => $r['in_training'] > 0 ? round($n / $r['in_training'] * 100, 1) : 0.0;
        $training = fn (array $t) => [$of($t['finished']), $of($t['in_progress']), $of($t['not_started']), $t['finished'], $t['in_progress'], $t['not_started']];
        $target = $facts['double']['target_monthly'];
        $month = fn (string $ym) => CarbonImmutable::parse($ym.'-01')->format('M Y');

        return [
            'group' => $groupType,
            'range' => CarbonImmutable::parse($facts['range']['from'])->format('M j, Y').' – '.CarbonImmutable::parse($facts['range']['to'])->format('M j, Y'),
            'members' => array_values($facts['members']),
            'sales' => [$m($facts['contribution']['total']), $facts['contribution']['sales']],
            'old' => $side($facts['contribution']['old']),
            'new' => $side($facts['contribution']['new']),
            'recruits' => [$r['signed_up'], $r['sold'], $r['conversion_pct'], $r['in_training']],
            'nao' => $training($r['nao']),
            'fire' => $training($r['fire']),
            'monthly' => array_map(fn ($x) => [$month($x['month']), $m($x['value']), $m($x['new_value'])], $facts['monthly']),
            'forecast' => array_map(fn ($x) => [$month($x['month']), $m($x['value']), $m($x['low']), $m($x['high']), $m($target - $x['value'])], $facts['forecast']),
            'double' => [$m($facts['double']['baseline_monthly']), $m($facts['double']['target_monthly'])],
            'capacity' => [$facts['capacity']['sellers_per_month'], $m($facts['capacity']['value_per_seller_month']), $facts['capacity']['sellers_needed']],
            'derived' => $this->derived($facts),
        ];
    }

    /**
     * Comparisons worked out here, so the model states them rather than calculates them (where it slips).
     *
     * @param  array<string, mixed>  $facts
     * @return array<string, float|null>
     */
    private function derived(array $facts): array
    {
        $pct = fn (float $now, float $before) => $before > 0 ? round(($now - $before) / $before * 100, 1) : null;
        $monthly = collect($facts['monthly']);
        $share = fn ($months) => ($v = $months->sum('value')) > 0 ? $months->sum('new_value') / $v * 100 : 0.0;
        $old = $facts['contribution']['old'];
        $new = $facts['contribution']['new'];
        $forecast = collect($facts['forecast'])->avg('value') ?? 0.0;
        $baseline = $facts['double']['baseline_monthly'];

        return [
            'last3_vs_prev3_pct' => $pct((float) $monthly->take(-3)->sum('value'), (float) $monthly->slice(-6, 3)->sum('value')),
            'forecast_vs_baseline_pct' => $pct($forecast, $baseline),
            'forecast_gap_to_target_m' => round(($facts['double']['target_monthly'] - $forecast) / 1_000_000, 1),
            'forecast_below_target_pct' => $facts['double']['target_monthly'] > 0 ? round(($facts['double']['target_monthly'] - $forecast) / $facts['double']['target_monthly'] * 100, 1) : null,
            'new_share_last3_pct' => round($share($monthly->take(-3)), 1),
            'new_share_first3_pct' => round($share($monthly->take(3)), 1),
            'productivity_gap_pp' => round($old['productivity_pct'] - $new['productivity_pct'], 1),
            'productivity_ratio_old_to_new' => $new['productivity_pct'] > 0 ? round($old['productivity_pct'] / $new['productivity_pct'], 1) : null,
            'per_seller_ratio_old_to_new' => $new['per_seller'] > 0 ? round($old['per_seller'] / $new['per_seller'], 1) : null,
            'extra_sellers_needed' => $facts['capacity']['sellers_needed'] !== null ? max(0, $facts['capacity']['sellers_needed'] - (int) round($facts['capacity']['sellers_per_month'])) : null,
        ];
    }

    /**
     * @param  array<string, mixed>  $facts
     * @return array<string, mixed>
     */
    private function ask(array $facts, string $groupType): array
    {
        // Everything fixed lives here and in the schema, ahead of the facts: an identical prefix is what OpenAI caches.
        $system = <<<'TXT'
You are a senior sales-performance analyst writing for the leadership of Leuterio Realty & Brokerage, a Philippine real-estate brokerage (Filipino Homes listings, Rent.ph rentals). You assess one team or sub-team (unit).

FACTS (compact JSON; amounts in millions of pesos):
- group: team or sub-team. range: the date range.
- members: [total, new, old] now on the group. New agents = signed up in the range; old = everyone else.
- sales: [valid sales value, number of sales] in the range, credited to the group at the reservation date.
- old / new: [value, % of the group's sales, sales, agents who sold, agents, % of agents who sold (productivity), value per seller].
- recruits: [signed up, sold any sale, % sold, still in training = no sale yet].
- nao / fire: [% finished, % in progress, % not started, finished, in progress, not started] of the recruits in training. NAO = New Agents Orientation; FIRE = Filipinohomes Institute of Real Estate, 3 modules.
- monthly: [month, value, of which new agents] for the last 12 whole months. forecast: [month, expected, low, high, gap to the monthly target] for the next 3.
- double: [baseline per month = last 3 months' average, target per month = 2 × baseline].
- capacity: [sellers per month (last 3 months), value per seller per month, sellers per month needed to reach the target at that value].
- derived: comparisons already computed — quote them, never recalculate: last3_vs_prev3_pct (sales trend), forecast_vs_baseline_pct, forecast_gap_to_target_m, forecast_below_target_pct, new agents' share of sales in the last / first 3 months (%), productivity_gap_pp, productivity_ratio_old_to_new, per_seller_ratio_old_to_new, extra_sellers_needed.

STANDARDS
- Precise: every claim carries its figure from the facts; every amount carries ₱ and M or B (₱14.3M per seller, never "14.3"). Amounts with at most 3 significant digits (₱12.5M, ₱507M, ₱1.02B); shares and rates with %; differences between percentages in percentage points (pp); ratios as "2.4×". Months as "Oct 2026".
- Correct comparisons: say which side is higher and by how much (pp, ×, or ₱). Never call different figures similar. If a figure is 0 or missing, say so plainly.
- Professional: formal, concise, objective, third person; call the group exactly what `group` says ("the team" or "the sub-team"). No hype, exclamation marks, emojis, filler ("leverage", "synergy", "boost", "game-changer"), hedging or rhetorical questions. One idea per sentence.
- Vocabulary: what the group sold is "sales" — the amount is "₱X in sales" or "sales of ₱X", the count is "N sales". Write "The team's sales were ₱5.03B from 2,685 sales", "Old agents' sales were ₱4.54B, 90.3% of the team's sales", "Forecast sales: ₱525M". Money is never "made", "booked", "generated", "produced", "delivered", "driven" or "brought in", and never "revenue", "income", "output", "volume", "deals" or "business" — it is sales. Agents "made a sale"; productivity is "the share of agents who made a sale".
- Actionable: actions and strategies begin with a verb and name who acts, how often or by when. KPIs read "metric: current → target by Mon YYYY" with a number on both sides — the current value from the facts and a specific, realistic target (never "higher", "lower", "improve" or "closer to").
- Plain words only: never write the facts' field names or codes (such as last3_vs_prev3_pct or per_seller); write "Sales in the last 3 months were 3.6% lower than in the 3 months before" (higher / lower, never a minus sign).
- Use only the facts. Never invent people, names, products, events or numbers not derivable from them.
TXT;

        $text = fn (string $what) => ['type' => 'string', 'description' => $what];
        $list = fn (array $item, string $what) => ['type' => 'array', 'items' => $item, 'description' => $what];
        $object = fn (array $properties) => ['type' => 'object', 'properties' => $properties, 'required' => array_keys($properties), 'additionalProperties' => false];

        return $this->ai->json($system, json_encode($this->brief($facts, $groupType), JSON_UNESCAPED_UNICODE), 'team_analysis', $object([
            'summary' => $text('Executive summary in 2–3 sentences, at most 55 words. Begin "The team\'s sales were ₱X from N sales" (or "The sub-team\'s"), then the trend and the gap to the target.'),
            'highlights' => $list($object([
                'text' => $text('One finding: the metric, its figure and its implication, e.g. "Old agents\' sales: ₱4.54B, 90.3% of the team\'s sales."; at most 20 words.'),
                'verdict' => ['type' => 'string', 'enum' => ['good', 'watch', 'risk']],
            ]), 'Exactly 4 findings.'),
            'contribution' => $text('Begin "Old agents\' sales were ₱X (Y% of sales); new agents\' sales were ₱X (Y%)." Then productivity (with the pp gap and ratio), sales per seller (with the ratio), and the implication for doubling sales; at most 65 words.'),
            'training' => $text('NAO and FIRE completion among recruits in training (finished, in progress, not started) and its effect on conversion to a first sale; at most 55 words.'),
            'outlook' => $list($object([
                'month' => $text('The forecast month as given.'),
                'expectation' => $text('The expected sales with its likely range, and the gap to the monthly target in ₱; at most 25 words.'),
                'focus' => $text('The month\'s single priority, at most 10 words.'),
                'actions' => $list($text('Verb first, with who acts and how often or by when; at most 16 words.'), 'Exactly 3 actions.'),
            ]), 'One entry per forecast month, in order.'),
            'strategies' => $list($object([
                'title' => $text('Verb first, at most 7 words.'),
                'detail' => $text('The evidence (a figure from the facts) and how to carry it out; at most 32 words.'),
                'owner' => $text('team leader, unit managers, old agents, new agents or back office.'),
                'kpi' => $text('metric: current number → target number by Mon YYYY, at most 16 words.'),
                'impact' => ['type' => 'string', 'enum' => ['high', 'medium', 'low']],
            ]), 'Exactly 10 strategies to double monthly sales from the baseline to the target, highest impact first.'),
        ]));
    }
}
