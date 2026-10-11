<?php

namespace App\Services;

use App\Models\Entities\SubTeam;
use App\Models\Entities\Team;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

// Navbar search for teams, sub-teams and areas, each linked to the page that reader may open for it. Follows the
// report reach: the back office finds every group and opens its sales report; leaders find only the teams and
// sub-teams they lead (and a team leader their team's sub-teams), opened in My Team; nobody else searches groups.
class GroupSearchService
{
    private const LIMIT = 5;

    public function __construct(private TeamLeadershipService $leadership) {}

    public function canSearch(User $user): bool
    {
        $lock = $this->leadership->reportScope($user);

        return $lock !== false && ! isset($lock['agent_id']);
    }

    /**
     * @return array<int, array{type: string, id: int|string, name: string, detail: ?string, logo: ?string, url: string}>
     */
    public function search(User $user, string $term): array
    {
        $lock = $this->leadership->reportScope($user);
        if ($lock === false || isset($lock['agent_id'])) {
            return [];
        }

        return $lock === null
            ? [...$this->teams($term), ...$this->subTeams($term), ...$this->areas($term)]
            : $this->ledGroups($user, $term);
    }

    private function teams(string $term): array
    {
        return DB::table('teams as t')
            ->leftJoin('agents as l', 'l.id', '=', 't.agent_id')
            ->leftJoin('users as lu', 'lu.id', '=', 'l.user_id')
            ->where('t.name', 'like', $this->like($term))
            ->orderByRaw("CASE WHEN t.status = 'active' THEN 0 ELSE 1 END")
            ->orderByRaw('CASE WHEN t.name LIKE ? THEN 0 ELSE 1 END', [$this->prefix($term)])
            ->orderBy('t.name')
            ->limit(self::LIMIT)
            ->get(['t.id', 't.name', 't.logo', 't.status', 'lu.name as leader'])
            ->map(fn ($t) => $this->result('team', $t->id, $t->name, $this->detail('Team', $t->leader ? "led by {$t->leader}" : null, $t->status), $t->logo, "/reports/top-agents?team_id={$t->id}"))
            ->all();
    }

    private function subTeams(string $term): array
    {
        return DB::table('sub_teams as s')
            ->leftJoin('teams as t', 't.id', '=', 's.team_id')
            ->where('s.name', 'like', $this->like($term))
            ->orderByRaw("CASE WHEN s.status = 'active' THEN 0 ELSE 1 END")
            ->orderByRaw('CASE WHEN s.name LIKE ? THEN 0 ELSE 1 END', [$this->prefix($term)])
            ->orderBy('s.name')
            ->limit(self::LIMIT)
            ->get(['s.id', 's.name', 's.logo', 's.status', 't.name as team'])
            ->map(fn ($s) => $this->result('sub_team', $s->id, $s->name, $this->detail('Sub-team', $s->team ? "of {$s->team}" : null, $s->status), $s->logo, "/reports/top-agents?sub_team_id={$s->id}"))
            ->all();
    }

    // An area matches by its own name or by a place listed under it ("Bulacan" finds Metro Manila).
    private function areas(string $term): array
    {
        $needle = mb_strtolower($term);

        return collect(config('areas'))
            ->map(function (array $area, string $key) use ($needle) {
                if (str_contains(mb_strtolower($area['name']), $needle)) {
                    return $this->result('area', $key, $area['name'], 'Area', null, "/reports/top-agents?area={$key}");
                }
                $place = collect($area['places'])->first(fn ($p) => str_contains(mb_strtolower($p), $needle));

                return $place ? $this->result('area', $key, $area['name'], "Area · includes {$place}", null, "/reports/top-agents?area={$key}") : null;
            })
            ->filter()
            ->take(self::LIMIT)
            ->values()
            ->all();
    }

    private function ledGroups(User $user, string $term): array
    {
        $needle = mb_strtolower($term);
        $teams = $this->leadership->teamsLedBy($user);
        $subTeams = $this->leadership->subTeamsLedBy($user)->keyBy('id');

        // A team leader also opens (read-only) every sub-team of their teams.
        if ($teams->isNotEmpty()) {
            SubTeam::with('team:id,name')->whereIn('team_id', $teams->pluck('id'))->where('status', '!=', Team::STATUS_DEACTIVATED)
                ->get()->each(fn (SubTeam $s) => $subTeams->put($s->id, $s));
        }

        $matches = fn (Collection $groups) => $groups->filter(fn ($g) => str_contains(mb_strtolower($g->name), $needle))->sortBy('name')->take(self::LIMIT);

        return [
            ...$matches($teams)->map(fn (Team $t) => $this->result('team', $t->id, $t->name, 'Your team', $t->logo, "/my-team?team={$t->id}"))->values()->all(),
            ...$matches($subTeams)->map(fn (SubTeam $s) => $this->result('sub_team', $s->id, $s->name, $this->detail('Sub-team', $s->team ? "of {$s->team->name}" : null, $s->status), $s->logo, "/my-team?sub_team={$s->id}"))->values()->all(),
        ];
    }

    private function detail(string $kind, ?string $context, string $status): string
    {
        return collect([$kind, $context, $status !== Team::STATUS_ACTIVE ? ucfirst($status) : null])->filter()->implode(' · ');
    }

    private function result(string $type, int|string $id, string $name, ?string $detail, ?string $logo, string $url): array
    {
        return compact('type', 'id', 'name', 'detail', 'logo', 'url');
    }

    private function like(string $term): string
    {
        return '%'.addcslashes($term, '%_\\').'%';
    }

    private function prefix(string $term): string
    {
        return addcslashes($term, '%_\\').'%';
    }
}
