<?php

namespace App\Services;

use App\Models\Entities\Agent;
use App\Models\User;
use App\Policies\UserPolicy;
use App\Support\Areas;
use Illuminate\Support\Facades\DB;

// The recruit network: an agent's sponsor is agent_attributes.referral_id, their downline everyone who names them.
// Only fully registered agents are shown (unfinished sign-ups aren't agents yet).
class GenealogyService
{
    // Most recruits loaded in one go, whatever the viewer asks for.
    public const PAGE = 50;

    // Sponsor chains are short; this only guards against a cycle in legacy data.
    private const MAX_DEPTH = 60;

    public const ROLES = ['team_leader', 'unit_manager', 'agent'];

    public function __construct(private OfficeService $offices) {}

    // Back office: the whole network. An office's secretary: agents of their areas and everyone below them.
    public function picksAny(User $user): bool
    {
        return $user->hasAnyRole(UserPolicy::SEARCH_ROLES);
    }

    public function canPick(User $user): bool
    {
        return $this->picksAny($user) || $this->offices->areasFor($user) !== [];
    }

    // An agent is within reach if the reader is the agent or sits above them, or (secretary) the agent or someone
    // above them belongs to the reader's areas.
    public function canView(User $user, int $agentId): bool
    {
        if ($this->picksAny($user)) {
            return DB::table('agents')->where('id', $agentId)->exists();
        }
        $own = (int) $user->agent()->value('id');
        $areas = $this->offices->areasFor($user);
        $seen = [];

        for ($id = $agentId, $depth = 0; $id && $depth < self::MAX_DEPTH && ! isset($seen[$id]); $depth++) {
            $seen[$id] = true;
            $row = DB::table('agents as a')->leftJoin('agent_attributes as aa', 'aa.agent_id', '=', 'a.id')
                ->where('a.id', $id)->first(['a.area', 'aa.referral_id']);
            if (! $row) {
                return false;
            }
            if ($id === $own || ($row->area && in_array($row->area, $areas, true))) {
                return true;
            }
            $id = $row->referral_id ? (int) $row->referral_id : null;
        }

        return false;
    }

    // The tree's top card: shown whatever its registration step, so an agent always sees their own tree.
    public function node(int $agentId): ?array
    {
        return $this->nodes(fn ($q) => $q->where('a.id', $agentId), null, false)->first();
    }

    /**
     * The next `$limit` of an agent's direct recruits after the first `$offset`, biggest downlines first.
     *
     * @return array{parent: int, offset: int, total: int, nodes: list<array<string, mixed>>}
     */
    public function branch(int $parentId, int $offset = 0, int $limit = self::PAGE): array
    {
        // Legacy has agents who name themselves as sponsor; they aren't their own recruit.
        $scope = fn ($q) => $q->where('aa.referral_id', $parentId)->where('a.id', '!=', $parentId);
        $total = $this->base()->tap($scope)->count();
        $nodes = $this->nodes($scope, fn ($q) => $q->orderByDesc('recruits')->orderBy('u.name')->offset($offset)->limit($limit));

        return ['parent' => $parentId, 'offset' => $offset, 'total' => $total, 'nodes' => $nodes->all()];
    }

    // The sponsors above an agent, nearest last, as far up as the reader may see.
    public function upline(User $user, int $agentId): array
    {
        $chain = [];
        $id = DB::table('agent_attributes')->where('agent_id', $agentId)->value('referral_id');

        while ($id && (int) $id !== $agentId && count($chain) < self::MAX_DEPTH && ! isset($chain[$id]) && $this->canView($user, (int) $id)) {
            $row = DB::table('agents as a')->leftJoin('users as u', 'u.id', '=', 'a.user_id')->leftJoin('agent_attributes as aa', 'aa.agent_id', '=', 'a.id')
                ->where('a.id', $id)->first(['a.id', 'a.first_name', 'a.last_name', 'u.name', 'aa.referral_id']);
            if (! $row) {
                break;
            }
            $chain[$row->id] = ['id' => $row->id, 'name' => $row->name ?: trim("{$row->first_name} {$row->last_name}")];
            $id = $row->referral_id;
        }

        return array_reverse(array_values($chain));
    }

    /**
     * Typeahead for choosing whose tree to open, within the reader's reach (back office: everyone; secretary: their areas).
     *
     * @return list<array<string, mixed>>
     */
    public function search(User $user, string $term, ?string $role): array
    {
        $like = '%'.addcslashes($term, '%_\\').'%';
        $areas = $this->picksAny($user) ? null : $this->offices->areasFor($user);

        return $this->nodes(function ($q) use ($like, $role, $areas) {
            $q->where(fn ($w) => $w->where('u.name', 'like', $like)->orWhere('u.email', 'like', $like));
            if ($role) {
                $q->where('r.name', $role);
            }
            if ($areas !== null) {
                $q->whereIn('a.area', $areas ?: ['']);
            }
        }, fn ($q) => $q->orderBy('u.name')->limit(15))->all();
    }

    private function base(bool $registeredOnly = true)
    {
        return DB::table('agents as a')
            ->join('users as u', 'u.id', '=', 'a.user_id')
            ->leftJoin('agent_attributes as aa', 'aa.agent_id', '=', 'a.id')
            ->leftJoin('role_user as ru', 'ru.user_id', '=', 'u.id')
            ->leftJoin('roles as r', 'r.id', '=', 'ru.role_id')
            ->when($registeredOnly, fn ($q) => $q->where('aa.registration_status', Agent::FULLY_REGISTERED));
    }

    private function nodes(callable $scope, ?callable $order = null, bool $registeredOnly = true)
    {
        $recruits = DB::table('agent_attributes as c')->whereColumn('c.referral_id', 'a.id')->whereColumn('c.agent_id', '!=', 'a.id')
            ->where('c.registration_status', Agent::FULLY_REGISTERED)->selectRaw('COUNT(*)');

        $rows = $this->base($registeredOnly)->tap($scope)
            ->select('a.id', 'a.first_name', 'a.last_name', 'a.avatar', 'a.area', 'a.activity', 'a.is_broker', 'a.broker_since', 'a.unit_manager_by', 'a.unit_manager_since', 'a.lr_joined_at', 'a.created_at', 'u.name', 'u.status', 'r.label as role')
            ->selectSub($recruits, 'recruits')
            ->when($order, fn ($q) => $q->tap($order))
            ->get();

        $teams = DB::table('team_agents as ta')->join('teams as t', 't.id', '=', 'ta.team_id')
            ->whereIn('ta.agent_id', $rows->pluck('id'))->where('ta.status', 'active')->pluck('t.name', 'ta.agent_id');
        $subTeams = DB::table('sub_team_agents as sa')->join('sub_teams as s', 's.id', '=', 'sa.sub_team_id')
            ->whereIn('sa.agent_id', $rows->pluck('id'))->where('sa.status', 'active')->pluck('s.name', 'sa.agent_id');

        return $rows->map(fn ($r) => [
            'id' => (int) $r->id,
            'name' => $r->name ?: trim("{$r->first_name} {$r->last_name}"),
            'avatar' => $r->avatar,
            'role' => $r->role,
            ...Agent::designationsOf($r),
            'status' => Agent::displayStatus($r->status, $r->activity),
            'area' => $r->area ? Areas::name($r->area) : null,
            'team' => $teams[$r->id] ?? null,
            'sub_team' => $subTeams[$r->id] ?? null,
            'joined' => substr((string) ($r->lr_joined_at ?: $r->created_at), 0, 10) ?: null,
            'recruits' => (int) $r->recruits,
        ]);
    }
}
