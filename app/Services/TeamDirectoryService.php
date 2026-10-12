<?php

namespace App\Services;

use App\Models\Entities\Agent;
use App\Models\Entities\Team;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

// Read side of Management. Teams (~80) and sub-teams (~500) are sent whole and filtered in the
// browser; agents (~83k) and membership history (~100k) are paged, searched and sorted here.
class TeamDirectoryService
{
    public const PER_PAGE = [25, 50, 100];

    /**
     * @return array<int, array<string, mixed>>
     */
    public function teams(): array
    {
        return DB::table('teams as t')
            ->leftJoin('agents as la', 'la.id', '=', 't.agent_id')
            ->leftJoin('users as lu', 'lu.id', '=', 'la.user_id')
            ->select('t.id', 't.name', 't.logo', 't.status', 't.agent_id', 't.created_at', 'lu.name as leader_name', 'la.avatar as leader_avatar')
            ->selectSub(fn (Builder $q) => $q->from('team_agents')->whereColumn('team_id', 't.id')->where('status', 'active')->selectRaw('COUNT(*)'), 'members_count')
            ->selectSub(fn (Builder $q) => $q->from('sub_teams')->whereColumn('team_id', 't.id')->where('status', '!=', Team::STATUS_DEACTIVATED)->selectRaw('COUNT(*)'), 'sub_teams_count')
            ->orderBy('t.name')
            ->get()
            ->map(fn ($t) => [...(array) $t, 'members_count' => (int) $t->members_count, 'sub_teams_count' => (int) $t->sub_teams_count])
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function subTeams(): array
    {
        return DB::table('sub_teams as s')
            ->join('teams as t', 't.id', '=', 's.team_id')
            ->leftJoin('agents as la', 'la.id', '=', 's.agent_id')
            ->leftJoin('users as lu', 'lu.id', '=', 'la.user_id')
            ->select('s.id', 's.name', 's.logo', 's.status', 's.agent_id', 's.team_id', 't.name as team_name', 'lu.name as leader_name', 'la.avatar as leader_avatar')
            ->selectSub(fn (Builder $q) => $q->from('sub_team_agents')->whereColumn('sub_team_id', 's.id')->where('status', 'active')->selectRaw('COUNT(*)'), 'members_count')
            ->orderBy('t.name')
            ->orderBy('s.name')
            ->get()
            ->map(fn ($s) => [...(array) $s, 'members_count' => (int) $s->members_count])
            ->all();
    }

    /**
     * Teams and their active sub-teams, for pickers.
     *
     * @return array<int, array<string, mixed>>
     */
    public function teamOptions(): array
    {
        $subTeams = DB::table('sub_teams')->where('status', Team::STATUS_ACTIVE)->orderBy('name')->get(['id', 'team_id', 'name'])->groupBy('team_id');

        return DB::table('teams')->orderBy('name')->get(['id', 'name', 'status'])
            ->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'status' => $t->status,
                'sub_teams' => $subTeams->get($t->id, collect())->map(fn ($s) => ['id' => $s->id, 'name' => $s->name])->values(),
            ])
            ->all();
    }

    /**
     * @param  array{q?: ?string, status?: ?string, team_id?: ?int, agent_type?: ?string, designation?: ?string, membership?: ?string, registration?: ?string, sort?: ?string, dir?: ?string, per_page?: ?int}  $filters
     */
    public function agents(array $filters): LengthAwarePaginator
    {
        // Keys are the table's column names.
        $sorts = ['name' => 'u.name', 'status' => 'u.status', 'agent_type' => 'a.agent_type', 'country' => 'a.country', 'area' => 'a.area', 'role_label' => 'r.label', 'team_name' => 't.name', 'joined_at' => 'ta.joined_at', 'id' => 'a.id', 'activated_at' => 'a.activated_at', 'is_broker' => 'a.is_broker'];
        $sorts['status'] = DB::raw(Agent::statusSql());

        $query = DB::table('agents as a')
            ->join('users as u', 'u.id', '=', 'a.user_id')
            ->leftJoin('role_user as ru', 'ru.user_id', '=', 'u.id')
            ->leftJoin('roles as r', 'r.id', '=', 'ru.role_id')
            // One active stint per agent (enforced by transfers and the legacy import).
            ->leftJoin('team_agents as ta', fn ($j) => $j->on('ta.agent_id', '=', 'a.id')->where('ta.status', 'active'))
            ->leftJoin('teams as t', 't.id', '=', 'ta.team_id')
            ->leftJoin('sub_team_agents as sa', fn ($j) => $j->on('sa.agent_id', '=', 'a.id')->where('sa.status', 'active'))
            ->leftJoin('sub_teams as s', 's.id', '=', 'sa.sub_team_id')
            ->select(
                'a.id', 'a.avatar', 'a.agent_type', 'a.is_broker', 'a.broker_since', 'a.unit_manager_by', 'a.unit_manager_since', 'a.activity', 'a.activated_at', 'a.country', 'a.country_code', 'a.area', 'u.id as user_id', 'u.name', 'u.email', 'r.name as role', 'r.label as role_label',
                't.id as team_id', 't.name as team_name', 's.id as sub_team_id', 's.name as sub_team_name', 'ta.joined_at',
            );
        // Status as people see it (dormant agents read "inactive"); account_status is what the status menu changes.
        $query->selectRaw(Agent::statusSql().' as status')->addSelect('u.status as account_status');

        $this->search($query, $filters['q'] ?? null, ['u.name', 'u.email']);

        if ($status = $filters['status'] ?? null) {
            $query->whereRaw(Agent::statusSql().' = ?', [$status]);
        }
        if ($teamId = $filters['team_id'] ?? null) {
            $query->where('ta.team_id', $teamId);
        } else {
            // Default: only agents on a team; "no_team" for the rest, "any" for everyone.
            match ($filters['membership'] ?? 'with_team') {
                'no_team' => $query->whereNull('ta.team_id'),
                'any' => null,
                default => $query->whereNotNull('ta.team_id'),
            };
        }
        // Default: fully registered only (registration step 4); unfinished sign-ups on request.
        match ($filters['registration'] ?? 'complete') {
            'incomplete' => $query->whereNotIn('a.id', Agent::fullyRegisteredIds()),
            'any' => null,
            default => $query->whereIn('a.id', Agent::fullyRegisteredIds()),
        };
        if ($type = $filters['agent_type'] ?? null) {
            $query->where('a.agent_type', $type);
        }
        match ($filters['designation'] ?? null) {
            'broker' => $query->where('a.is_broker', true),
            'um_rate' => $query->where('a.unit_manager_by', Agent::UM_BY_RATE),
            'um_dashboard' => $query->where('a.unit_manager_by', Agent::UM_BY_DASHBOARD),
            default => null,
        };

        return $this->sortAndPage($query, $filters, $sorts, 'name');
    }

    /**
     * Membership history, newest change first: every join and every transfer out.
     *
     * @param  array{q?: ?string, team_id?: ?int, sort?: ?string, dir?: ?string, per_page?: ?int}  $filters
     */
    public function transfers(array $filters): LengthAwarePaginator
    {
        $sorts = ['changed_on' => 'changed_on', 'name' => 'u.name', 'team_name' => 't.name', 'joined_at' => 'ta.joined_at', 'transferred_at' => 'ta.transferred_at', 'status' => 'ta.status'];

        $query = DB::table('team_agents as ta')
            ->join('agents as a', 'a.id', '=', 'ta.agent_id')
            ->join('users as u', 'u.id', '=', 'a.user_id')
            ->join('teams as t', 't.id', '=', 'ta.team_id')
            ->select(
                'ta.id', 'ta.agent_id', 'a.avatar', 'u.name', 't.id as team_id', 't.name as team_name',
                'ta.joined_at', 'ta.transferred_at', 'ta.status',
            )
            ->selectRaw('COALESCE(ta.transferred_at, ta.joined_at) as changed_on');

        $this->search($query, $filters['q'] ?? null, ['u.name', 'u.email', 't.name']);

        if ($teamId = $filters['team_id'] ?? null) {
            $query->where('ta.team_id', $teamId);
        }

        return $this->sortAndPage($query, $filters, $sorts, 'changed_on', 'desc');
    }

    /**
     * @param  string[]  $columns
     */
    private function search(Builder $query, ?string $term, array $columns): void
    {
        $term = trim((string) $term);

        if (mb_strlen($term) < 2) {
            return;
        }

        $like = '%'.addcslashes($term, '%_\\').'%';
        $query->where(function (Builder $q) use ($columns, $like) {
            foreach ($columns as $column) {
                $q->orWhere($column, 'like', $like);
            }
        });
    }

    /**
     * @param  array<string, string>  $sorts  allowed sort key => column
     */
    private function sortAndPage(Builder $query, array $filters, array $sorts, string $defaultSort, string $defaultDir = 'asc'): LengthAwarePaginator
    {
        $sort = $sorts[$filters['sort'] ?? ''] ?? $sorts[$defaultSort];
        $dir = in_array($filters['dir'] ?? null, ['asc', 'desc'], true) ? $filters['dir'] : $defaultDir;
        $perPage = in_array((int) ($filters['per_page'] ?? 0), self::PER_PAGE, true) ? (int) $filters['per_page'] : self::PER_PAGE[0];

        return $query->orderBy($sort, $dir)
            // A stable tiebreak so rows don't jump between pages.
            ->orderBy($query->from === 'agents as a' ? 'a.id' : 'ta.id', $dir)
            ->paginate($perPage)
            ->withQueryString();
    }
}
