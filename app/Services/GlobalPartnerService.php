<?php

namespace App\Services;

use App\Models\Entities\Agent;
use App\Models\User;
use App\Policies\UserPolicy;
use App\Support\Countries;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

// Global partners (agents.agent_type = global_partner, based outside the Philippines, fully registered, joined from
// 2024-02-01) and their international sales — kept apart from the local sales statistics. The back office sees every
// partner; anyone else sees the partners they recruited (agent_attributes.referral_id) plus, if they lead a team or
// sub-team (teams/sub_teams.agent_id), every partner currently on it — and can confirm those (agents.sponsor_confirmed_at).
class GlobalPartnerService
{
    private const PER_PAGE = [25, 50, 100];

    // Keys are the table's column names.
    private const SORTS = ['name' => 'u.name', 'country' => 'a.country', 'joined' => 'a.created_at', 'confirmed_at' => 'a.sponsor_confirmed_at', 'sales_value' => 'sales_value', 'team' => 't.name'];

    // International sales that count: not thrown out (legacy imported them all as pending).
    private const COUNTED_STATUSES = ['valid', 'pending'];

    public function __construct(private ActivityLogger $activity, private TeamLeadershipService $leadership) {}

    /**
     * Whose partners this user sees: everyone's (null, back office); else their own recruits (sponsor) and, for a team
     * leader / unit manager, every partner on the teams / sub-teams they lead; false when that's nobody.
     *
     * @return array{sponsor: ?int, teams: array<int, int>, sub_teams: array<int, int>}|null|false
     */
    public function reach(User $user): array|null|false
    {
        if ($user->hasAnyRole(UserPolicy::SEARCH_ROLES)) {
            return null;
        }

        $agentId = $user->agent()->value('id');
        if (! $agentId) {
            return false;
        }

        $reach = [
            'sponsor' => (int) $agentId,
            'teams' => $this->leadership->teamsLedBy($user)->pluck('id')->map(fn ($id) => (int) $id)->all(),
            'sub_teams' => $this->leadership->subTeamsLedBy($user)->pluck('id')->map(fn ($id) => (int) $id)->all(),
        ];

        return $this->partners($reach)->exists() ? $reach : false;
    }

    // Whether the reach covers more than the user's own recruits (team leader / unit manager): then ranking recruiters
    // and showing each partner's sponsor are worth it.
    public function coversOthers(array|null $reach): bool
    {
        return $reach === null || $reach['teams'] || $reach['sub_teams'];
    }

    // Partners waiting for confirmation within the user's reach (the menu badge).
    public function pendingCount(User $user): int
    {
        $reach = $this->reach($user);

        return $reach === false ? 0 : $this->partners($reach)->whereNull('a.sponsor_confirmed_at')->count();
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function filters(array $input): array
    {
        $today = CarbonImmutable::today();
        $date = fn ($v) => is_string($v) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $v) ? $v : null;
        $from = $date($input['from'] ?? null) ?? '2000-01-01';
        $to = $date($input['to'] ?? null) ?? $today->toDateString();

        return [
            'q' => trim((string) ($input['q'] ?? '')) ?: null,
            // Waiting first: that's the work.
            'confirmation' => in_array($input['confirmation'] ?? null, ['pending', 'confirmed', 'all'], true) ? $input['confirmation'] : 'pending',
            'country' => is_string($input['country'] ?? null) && preg_match('/^[A-Z]{2}$/', $input['country']) ? $input['country'] : null,
            // Statistics drill-down: one team's or one recruiter's (sponsor's) global partners.
            'team_id' => (int) ($input['team_id'] ?? 0) ?: null,
            'sponsor_id' => (int) ($input['sponsor_id'] ?? 0) ?: null,
            'from' => min($from, $to),
            'to' => max($from, $to),
            'status' => in_array($input['status'] ?? null, ['valid', 'pending', 'invalid', 'cancelled'], true) ? $input['status'] : 'all',
            'sort' => array_key_exists($input['sort'] ?? '', self::SORTS) ? $input['sort'] : 'joined',
            'dir' => ($input['dir'] ?? null) === 'asc' ? 'asc' : 'desc',
            'page' => max(1, (int) ($input['page'] ?? 1)),
            'per_page' => in_array((int) ($input['per_page'] ?? 0), self::PER_PAGE, true) ? (int) $input['per_page'] : self::PER_PAGE[0],
        ];
    }

    /**
     * @return array{all: int, pending: int, confirmed: int}
     */
    public function counts(array|null $reach, array $f): array
    {
        $row = $this->search($this->partners($reach), $f)
            ->selectRaw('COUNT(*) as total, SUM(CASE WHEN a.sponsor_confirmed_at IS NULL THEN 1 ELSE 0 END) as pending')->first();

        return ['all' => (int) $row->total, 'pending' => (int) $row->pending, 'confirmed' => (int) $row->total - (int) $row->pending];
    }

    public function table(array|null $reach, array $f): LengthAwarePaginator
    {
        $sales = DB::table('international_sales')->whereIn('sale_status', self::COUNTED_STATUSES)
            ->groupBy('agent_id')->selectRaw('agent_id, COUNT(*) as n, SUM(total_contract_price) as v');

        $query = $this->search($this->partners($reach), $f)
            ->leftJoin('agents as sp', 'sp.id', '=', 'at.referral_id')
            ->leftJoin('users as spu', 'spu.id', '=', 'sp.user_id')
            ->leftJoin('users as cu', 'cu.id', '=', 'a.sponsor_confirmed_by')
            ->leftJoinSub($sales, 'ps', 'ps.agent_id', '=', 'a.id')
            // The partner's own current team and sub-team (one active stint each).
            ->leftJoin('team_agents as ta', fn ($j) => $j->on('ta.agent_id', '=', 'a.id')->where('ta.status', 'active'))
            ->leftJoin('teams as t', 't.id', '=', 'ta.team_id')
            ->leftJoin('sub_team_agents as sa', fn ($j) => $j->on('sa.agent_id', '=', 'a.id')->where('sa.status', 'active'))
            ->leftJoin('sub_teams as s', 's.id', '=', 'sa.sub_team_id')
            ->when($f['confirmation'] === 'pending', fn ($q) => $q->whereNull('a.sponsor_confirmed_at'))
            ->when($f['confirmation'] === 'confirmed', fn ($q) => $q->whereNotNull('a.sponsor_confirmed_at'))
            ->select('a.id', 'a.avatar', 'a.country', 'a.country_code', 'a.created_at as joined', 'a.sponsor_confirmed_at as confirmed_at',
                'u.name', 'u.email', 'u.status', 't.name as team_name', 's.name as sub_team_name', 'at.referral_id as sponsor_id', 'spu.name as sponsor_name', 'spu.email as sponsor_email', 'cu.name as confirmed_by')
            ->selectRaw('COALESCE(ps.n, 0) as sales_count, COALESCE(ps.v, 0) as sales_value');

        return $query->orderBy(self::SORTS[$f['sort']], $f['dir'])->orderByDesc('a.id')
            ->paginate($f['per_page'], ['*'], 'page', $f['page'])
            ->through(fn ($r) => [...(array) $r, 'sales_count' => (int) $r->sales_count, 'sales_value' => (float) $r->sales_value]);
    }

    public function confirm(Agent $partner, User $by): void
    {
        if ($partner->sponsor_confirmed_at) {
            return;
        }

        $partner->forceFill(['sponsor_confirmed_at' => now(), 'sponsor_confirmed_by' => $by->id])->save();
        $name = $partner->user?->name ?? "agent #{$partner->id}";
        $this->activity->describe('partner.confirmed', "Confirmed global partner {$name}", $partner);
    }

    // Whether this user may confirm (and see) this partner.
    public function canManage(User $user, Agent $partner): bool
    {
        $reach = $this->reach($user);

        return $reach !== false && $this->partners($reach)->where('a.id', $partner->id)->exists();
    }

    /**
     * Global partners and their international sales: partners by country (flags), sales by client country, the trend and
     * the top partners, within the reach and the sales date range.
     *
     * @return array<string, mixed>
     */
    public function statistics(array|null $reach, array $f): array
    {
        $byCountry = $this->narrowed($reach, $f)
            ->selectRaw("a.country_code as code, MAX(a.country) as name, COUNT(*) as partners, SUM(CASE WHEN a.sponsor_confirmed_at IS NULL THEN 0 ELSE 1 END) as confirmed")
            ->groupBy('a.country_code')->orderByDesc('partners')->get()
            ->map(fn ($r) => ['code' => $r->code, 'name' => $r->name ?? 'Not specified', 'partners' => (int) $r->partners, 'confirmed' => (int) $r->confirmed])->all();

        $sales = fn () => $this->sales($reach, $f);
        $totals = $sales()->selectRaw('COUNT(*) as n, COALESCE(SUM(i.total_contract_price), 0) as v, COUNT(DISTINCT i.agent_id) as partners')->first();

        $clientCountries = [];
        $sales()->leftJoin('international_sale_clients as c', 'c.international_sale_id', '=', 'i.id')
            ->groupBy('c.country')->selectRaw('c.country as raw, COUNT(*) as n, COALESCE(SUM(i.total_contract_price), 0) as v')->get()
            ->each(function ($r) use (&$clientCountries) {
                ['name' => $name, 'code' => $code] = Countries::resolve($r->raw);
                $key = $name ?? 'Not specified';
                $clientCountries[$key] ??= ['name' => $key, 'code' => $code, 'sales' => 0, 'value' => 0.0];
                $clientCountries[$key]['sales'] += (int) $r->n;
                $clientCountries[$key]['value'] += (float) $r->v;
            });
        usort($clientCountries, fn ($a, $b) => $b['value'] <=> $a['value']);

        $month = 'SUBSTR(CAST(i.reservation_date AS CHAR), 1, 7)';
        $trend = $sales()->selectRaw("{$month} as month, COUNT(*) as sales, COALESCE(SUM(i.total_contract_price), 0) as value")
            ->groupByRaw($month)->orderBy('month')->get()
            ->map(fn ($r) => ['month' => $r->month, 'sales' => (int) $r->sales, 'value' => (float) $r->value])->all();

        $top = $sales()->join('agents as pa', 'pa.id', '=', 'i.agent_id')->leftJoin('users as pu', 'pu.id', '=', 'pa.user_id')
            ->groupBy('i.agent_id', 'pu.name', 'pa.avatar', 'pa.country', 'pa.country_code')
            ->selectRaw('i.agent_id as id, pu.name, pa.avatar, pa.country, pa.country_code, COUNT(*) as sales, SUM(i.total_contract_price) as value')
            ->orderByDesc('value')->get()
            ->map(fn ($r) => [...(array) $r, 'sales' => (int) $r->sales, 'value' => (float) $r->value])->all();

        $teams = $this->topTeams($reach, $f);
        // Someone who only sees their own recruits would only rank themselves.
        $recruiters = $this->coversOthers($reach) ? $this->topRecruiters($reach, $f) : [];

        $partners = array_sum(array_column($byCountry, 'partners'));
        $confirmed = array_sum(array_column($byCountry, 'confirmed'));

        return [
            'partners' => ['total' => $partners, 'confirmed' => $confirmed, 'pending' => $partners - $confirmed, 'countries' => count($byCountry)],
            'by_country' => $byCountry,
            'sales' => ['count' => (int) $totals->n, 'value' => (float) $totals->v, 'partners' => (int) $totals->partners],
            // Every country and every partner who sold: the page shows them a page at a time.
            'client_countries' => array_values($clientCountries),
            'trend' => $trend,
            'top_partners' => $top,
            'top_teams' => $teams,
            'top_recruiters' => $recruiters,
            'selection' => $this->selection($f),
        ];
    }

    /**
     * Teams with global partners (the partner's current team), by their partners' international sales, then headcount.
     *
     * @return array<int, array{id: int, name: string, logo: ?string, partners: int, sales: int, value: float}>
     */
    private function topTeams(array|null $reach, array $f): array
    {
        $partners = $this->narrowed($reach, $f)
            ->join('team_agents as tta', fn ($j) => $j->on('tta.agent_id', '=', 'a.id')->where('tta.status', 'active'))
            ->join('teams as tt', 'tt.id', '=', 'tta.team_id')
            ->groupBy('tt.id', 'tt.name', 'tt.logo')
            ->selectRaw('tt.id, tt.name, tt.logo, COUNT(*) as partners')->get()->keyBy('id');

        $sales = $this->sales($reach, $f)
            ->join('team_agents as sta', fn ($j) => $j->on('sta.agent_id', '=', 'i.agent_id')->where('sta.status', 'active'))
            ->groupBy('sta.team_id')->selectRaw('sta.team_id as id, COUNT(*) as n, SUM(i.total_contract_price) as v')->get()->keyBy('id');

        return $partners->map(fn ($t) => [
            'id' => (int) $t->id, 'name' => $t->name, 'logo' => $t->logo, 'partners' => (int) $t->partners,
            'sales' => (int) ($sales[$t->id]->n ?? 0), 'value' => (float) ($sales[$t->id]->v ?? 0),
        ])->sortBy([['value', 'desc'], ['partners', 'desc']])->values()->all();
    }

    /**
     * Sponsors by how many global partners they recruited (with those partners' international sales).
     *
     * @return array<int, array{id: int, name: ?string, avatar: ?string, partners: int, sales: int, value: float}>
     */
    private function topRecruiters(array|null $reach, array $f): array
    {
        $partners = $this->narrowed($reach, $f)->whereNotNull('at.referral_id')
            ->leftJoin('agents as ra', 'ra.id', '=', 'at.referral_id')->leftJoin('users as ru', 'ru.id', '=', 'ra.user_id')
            ->groupBy('at.referral_id', 'ru.name', 'ra.avatar')
            ->selectRaw('at.referral_id as id, ru.name, ra.avatar, COUNT(*) as partners')->get()->keyBy('id');

        $sales = $this->sales($reach, $f)->join('agent_attributes as sat', 'sat.agent_id', '=', 'i.agent_id')
            ->groupBy('sat.referral_id')->selectRaw('sat.referral_id as id, COUNT(*) as n, SUM(i.total_contract_price) as v')->get()->keyBy('id');

        return $partners->map(fn ($r) => [
            'id' => (int) $r->id, 'name' => $r->name ?? "Member #{$r->id}", 'avatar' => $r->avatar, 'partners' => (int) $r->partners,
            'sales' => (int) ($sales[$r->id]->n ?? 0), 'value' => (float) ($sales[$r->id]->v ?? 0),
        ])->sortBy([['partners', 'desc'], ['value', 'desc']])->values()->all();
    }

    /**
     * What the statistics are narrowed to (a clicked team, recruiter or country), for the page header.
     *
     * @return array{type: string, name: string, code?: ?string}|null
     */
    private function selection(array $f): ?array
    {
        return match (true) {
            (bool) $f['team_id'] => ['type' => 'team', 'name' => (string) DB::table('teams')->where('id', $f['team_id'])->value('name')],
            (bool) $f['sponsor_id'] => ['type' => 'recruiter', 'name' => (string) (DB::table('agents as a')->leftJoin('users as u', 'u.id', '=', 'a.user_id')->where('a.id', $f['sponsor_id'])->value('u.name') ?? "Member #{$f['sponsor_id']}")],
            (bool) $f['country'] => ['type' => 'country', 'name' => (string) (DB::table('agents')->where('country_code', $f['country'])->value('country') ?? $f['country']), 'code' => $f['country']],
            default => null,
        };
    }

    // The partners in reach, narrowed to the clicked team / recruiter / country.
    private function narrowed(array|null $reach, array $f): Builder
    {
        return $this->partners($reach)
            ->when($f['country'] ?? null, fn ($q, $code) => $q->where('a.country_code', $code))
            ->when($f['sponsor_id'] ?? null, fn ($q, $id) => $q->where('at.referral_id', $id))
            ->when($f['team_id'] ?? null, fn ($q, $id) => $q->whereExists(fn ($s) => $s->from('team_agents as nta')
                ->whereColumn('nta.agent_id', 'a.id')->where('nta.status', 'active')->where('nta.team_id', $id)));
    }

    // Every global partner in the reach (the sponsor's own invites for a sponsor) who counts here: based outside the
    // Philippines, fully registered, and joined (signed up) from GLOBAL_PARTNER_SINCE.
    private function partners(array|null $reach): Builder
    {
        return DB::table('agents as a')
            ->leftJoin('users as u', 'u.id', '=', 'a.user_id')
            ->join('agent_attributes as at', 'at.agent_id', '=', 'a.id')
            ->where('a.agent_type', Agent::TYPE_GLOBAL_PARTNER)
            ->whereNotNull('a.country_code')
            ->where('a.country_code', '!=', Agent::DEFAULT_COUNTRY_CODE)
            ->where('at.registration_status', Agent::FULLY_REGISTERED)
            // Joined Leuterio Realty (else signed up) from the cut-off — the date the agent-type rule uses too.
            ->whereRaw('COALESCE(a.lr_joined_at, a.created_at) >= ?', [Agent::GLOBAL_PARTNER_SINCE])
            ->when($reach !== null, fn ($q) => $q->where(function ($w) use ($reach) {
                $w->where('at.referral_id', $reach['sponsor'])
                    ->when($reach['teams'], fn ($o) => $o->orWhereExists(fn ($s) => $s->from('team_agents as rta')
                        ->whereColumn('rta.agent_id', 'a.id')->where('rta.status', 'active')->whereIn('rta.team_id', $reach['teams'])))
                    ->when($reach['sub_teams'], fn ($o) => $o->orWhereExists(fn ($s) => $s->from('sub_team_agents as rsa')
                        ->whereColumn('rsa.agent_id', 'a.id')->where('rsa.status', 'active')->whereIn('rsa.sub_team_id', $reach['sub_teams'])));
            }));
    }

    private function search(Builder $query, array $f): Builder
    {
        if ($f['country']) {
            $query->where('a.country_code', $f['country']);
        }
        // Name or email, the partner's current team / sub-team, their sponsor (name or email) or their country.
        // Sub-queries, not joins, so the counts and the table search the same way.
        if ($f['q'] !== null && mb_strlen($f['q']) >= 2) {
            $like = '%'.addcslashes($f['q'], '%_\\').'%';
            $query->where(fn ($q) => $q->where('u.name', 'like', $like)->orWhere('u.email', 'like', $like)->orWhere('a.country', 'like', $like)
                ->orWhereExists(fn ($s) => $s->from('team_agents as qta')->join('teams as qt', 'qt.id', '=', 'qta.team_id')
                    ->whereColumn('qta.agent_id', 'a.id')->where('qta.status', 'active')->where('qt.name', 'like', $like))
                ->orWhereExists(fn ($s) => $s->from('sub_team_agents as qsa')->join('sub_teams as qs', 'qs.id', '=', 'qsa.sub_team_id')
                    ->whereColumn('qsa.agent_id', 'a.id')->where('qsa.status', 'active')->where('qs.name', 'like', $like))
                ->orWhereExists(fn ($s) => $s->from('agents as qsp')->join('users as qspu', 'qspu.id', '=', 'qsp.user_id')
                    ->whereColumn('qsp.id', 'at.referral_id')->where(fn ($w) => $w->where('qspu.name', 'like', $like)->orWhere('qspu.email', 'like', $like))));
        }

        return $query;
    }

    // International sales of the reach's partners in the date range (reservation date).
    private function sales(array|null $reach, array $f): Builder
    {
        return DB::table('international_sales as i')
            ->whereBetween('i.reservation_date', [$f['from'], $f['to']])
            ->when($f['status'] === 'all', fn ($q) => $q->whereIn('i.sale_status', self::COUNTED_STATUSES), fn ($q) => $q->where('i.sale_status', $f['status']))
            // Only the partners shown here (in reach, outside the Philippines, registered, joined since the cut-off) and
            // the clicked team / recruiter / country.
            ->whereIn('i.agent_id', $this->narrowed($reach, $f)->select('a.id'));
    }
}
