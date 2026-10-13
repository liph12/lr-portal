<?php

namespace App\Services;

use App\Models\Entities\Agent;
use App\Models\Entities\SubTeam;
use App\Models\Entities\Team;
use App\Models\User;
use App\Policies\UserPolicy;
use App\Support\Areas;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

// "My Team": what a team leader (leads a team) or unit manager (leads a sub-team) may see and change.
// Leadership comes from teams.agent_id / sub_teams.agent_id, not from the role, so it follows the data.
// Team leaders manage their sub-teams and move members inside the team; unit managers only monitor.
class TeamLeadershipService
{
    public function __construct(private TeamManagementService $teams, private OfficeService $offices) {}

    /**
     * @return Collection<int, Team>
     */
    public function teamsLedBy(User $user): Collection
    {
        $agentId = $user->agent()->value('id');

        return $agentId ? Team::where('agent_id', $agentId)->where('status', '!=', Team::STATUS_DEACTIVATED)->orderBy('name')->get() : collect();
    }

    /**
     * @return Collection<int, SubTeam>
     */
    public function subTeamsLedBy(User $user): Collection
    {
        $agentId = $user->agent()->value('id');

        return $agentId ? SubTeam::with('team:id,name')->where('agent_id', $agentId)->where('status', '!=', Team::STATUS_DEACTIVATED)->orderBy('name')->get() : collect();
    }

    public function leadsAny(User $user): bool
    {
        return $this->teamsLedBy($user)->isNotEmpty() || $this->subTeamsLedBy($user)->isNotEmpty();
    }

    /**
     * Agent ids of the current members of every team and sub-team the user leads (null when they lead none).
     */
    public function ledMemberIds(User $user): ?\Illuminate\Database\Query\Builder
    {
        $teams = $this->teamsLedBy($user)->pluck('id');
        $subTeams = $this->subTeamsLedBy($user)->pluck('id');
        if ($teams->isEmpty() && $subTeams->isEmpty()) {
            return null;
        }

        return DB::table('team_agents')->where('status', 'active')->whereIn('team_id', $teams)->select('agent_id')
            ->union(DB::table('sub_team_agents')->where('status', 'active')->whereIn('sub_team_id', $subTeams)->select('agent_id'));
    }

    public function leadsTeam(User $user, Team $team): bool
    {
        return $team->status !== Team::STATUS_DEACTIVATED && $team->agent_id !== null && $team->agent_id === $user->agent()->value('id');
    }

    public function leadsSubTeam(User $user, SubTeam $subTeam): bool
    {
        return $subTeam->status !== Team::STATUS_DEACTIVATED && $subTeam->agent_id !== null && $subTeam->agent_id === $user->agent()->value('id');
    }

    /**
     * The group the page is about: ?team= / ?sub_team= when the user leads it, else their first team, else first sub-team.
     *
     * @return array{type: 'team'|'sub_team', group: Team|SubTeam, via?: Team}|null
     */
    public function current(User $user, ?int $teamId, ?int $subTeamId): ?array
    {
        $teams = $this->teamsLedBy($user);
        $subTeams = $this->subTeamsLedBy($user);

        if ($teamId && ($team = $teams->firstWhere('id', $teamId))) {
            return ['type' => 'team', 'group' => $team];
        }
        if ($subTeamId && ($subTeam = $subTeams->firstWhere('id', $subTeamId))) {
            return ['type' => 'sub_team', 'group' => $subTeam];
        }
        // A team leader can open any sub-team of their team, to look at its network and sales (not manage it here).
        if ($subTeamId && ($subTeam = SubTeam::with('team:id,name')->find($subTeamId)) && $teams->contains('id', $subTeam->team_id)) {
            return ['type' => 'sub_team', 'group' => $subTeam, 'via' => $teams->firstWhere('id', $subTeam->team_id)];
        }
        if ($teams->isNotEmpty()) {
            return ['type' => 'team', 'group' => $teams->first()];
        }

        return $subTeams->isNotEmpty() ? ['type' => 'sub_team', 'group' => $subTeams->first()] : null;
    }

    /**
     * How far a user's sales reports reach. Back office (superadmin, admin, staff) sees the whole system (null); an
     * office secretary their office's area (agents, unit managers and the teams with members there); a team leader /
     * unit manager only their own group; anyone else only their own sales. False: no reports.
     *
     * @return array<string, int>|null|false filter keys to force on every report
     */
    public function reportScope(User $user): array|null|false
    {
        if ($user->hasAnyRole(UserPolicy::SEARCH_ROLES)) {
            return $user->can('view_reports') ? null : false;
        }

        // One office (and so one area) per secretary in the data; the first if that ever changes.
        if ($user->can('view_reports') && ($area = $this->offices->areasFor($user)[0] ?? null)) {
            return ['area' => $area];
        }

        if ($current = $this->current($user, null, null)) {
            return [$current['type'] === 'team' ? 'team_id' : 'sub_team_id' => $current['group']->id];
        }

        $agentId = $user->can('view_reports') ? $user->agent()->value('id') : null;

        return $agentId ? ['agent_id' => $agentId] : false;
    }

    /**
     * For the menu and the group switcher.
     *
     * @return array{teams: array<int, array{id: int, name: string}>, sub_teams: array<int, array{id: int, name: string, team: ?string}>}
     */
    public function summaryFor(User $user): array
    {
        return [
            'teams' => $this->teamsLedBy($user)->map(fn (Team $t) => ['id' => $t->id, 'name' => $t->name])->values()->all(),
            'sub_teams' => $this->subTeamsLedBy($user)->map(fn (SubTeam $s) => ['id' => $s->id, 'name' => $s->name, 'team' => $s->team?->name])->values()->all(),
        ];
    }

    /**
     * Active members of the group, paged (a team can have thousands), with their sub-team (for a team) and area.
     *
     * @param  array{q?: ?string, page?: int, per_page?: int}  $filters
     */
    public function members(string $type, Team|SubTeam $group, array $filters = []): LengthAwarePaginator
    {
        $table = $type === 'team' ? 'team_agents' : 'sub_team_agents';
        $column = $type === 'team' ? 'team_id' : 'sub_team_id';

        $query = DB::table("{$table} as m")
            ->join('agents as a', 'a.id', '=', 'm.agent_id')
            ->join('users as u', 'u.id', '=', 'a.user_id')
            ->leftJoin('role_user as ru', 'ru.user_id', '=', 'u.id')
            ->leftJoin('roles as r', 'r.id', '=', 'ru.role_id')
            ->where("m.{$column}", $group->id)
            ->where('m.status', 'active')
            ->select('a.id', 'a.avatar', 'a.area', 'u.name', 'u.email', 'r.label as role', 'm.joined_at')
            ->selectRaw(Agent::statusSql().' as status');

        if ($type === 'team') {
            // Their current sub-team, if it's one of this team's.
            $query->leftJoin('sub_team_agents as sa', fn ($j) => $j->on('sa.agent_id', '=', 'a.id')->where('sa.status', 'active'))
                ->leftJoin('sub_teams as s', fn ($j) => $j->on('s.id', '=', 'sa.sub_team_id')->where('s.team_id', $group->id))
                ->addSelect('s.id as sub_team_id', 's.name as sub_team_name');
        }

        $term = trim((string) ($filters['q'] ?? ''));
        if (mb_strlen($term) >= 2) {
            $like = '%'.addcslashes($term, '%_\\').'%';
            $query->where(fn ($q) => $q->where('u.name', 'like', $like)->orWhere('u.email', 'like', $like));
        }

        $perPage = in_array((int) ($filters['per_page'] ?? 0), [25, 50, 100], true) ? (int) $filters['per_page'] : 25;

        return $query->orderBy('u.name')->orderBy('a.id')
            ->paginate($perPage, ['*'], 'page', max(1, (int) ($filters['page'] ?? 1)))
            ->through(fn ($r) => [...(array) $r, 'area' => $r->area ? Areas::name($r->area) : null, 'is_leader' => (int) $r->id === (int) $group->agent_id]);
    }

    public function memberCount(string $type, Team|SubTeam $group): int
    {
        return DB::table($type === 'team' ? 'team_agents' : 'sub_team_agents')
            ->where($type === 'team' ? 'team_id' : 'sub_team_id', $group->id)
            ->where('status', 'active')
            ->count();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function subTeamsOf(Team $team): array
    {
        return DB::table('sub_teams as s')
            ->leftJoin('agents as l', 'l.id', '=', 's.agent_id')
            ->leftJoin('users as lu', 'lu.id', '=', 'l.user_id')
            ->where('s.team_id', $team->id)
            ->select('s.id', 's.name', 's.logo', 's.status', 's.agent_id', 'lu.name as leader_name', 'l.avatar as leader_avatar')
            ->selectSub(fn ($q) => $q->from('sub_team_agents')->whereColumn('sub_team_id', 's.id')->where('status', 'active')->selectRaw('COUNT(*)'), 'members_count')
            ->orderBy('s.name')
            ->get()
            ->map(fn ($r) => [...(array) $r, 'members_count' => (int) $r->members_count])
            ->all();
    }
}
