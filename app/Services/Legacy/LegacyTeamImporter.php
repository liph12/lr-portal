<?php

namespace App\Services\Legacy;

use App\Models\Entities\Team;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Copies legacy teams into teams / team_agents / sub_teams / sub_team_agents. See
 * docs/legacy-migration/teams.md.
 *
 * Every member reference uses the legacy `members.id` (`memid`, `memID`, `LeadID`), which is the
 * agent id in this database — never the old `agentid` (that was `members.memberid`).
 *
 * Membership status: legacy `dateresigned` is usually set in advance (a future end date) and
 * `activeTeam = 1` marks the live row; nobody stays active on a closed team. Agents were
 * transferred by adding a new row, so per agent only the newest membership (by date joined) can
 * be active; earlier ones are closed, with `transferred_at` set to the date the next one starts.
 */
class LegacyTeamImporter
{
    private const ACTIVE = 'active';
    private const INACTIVE = 'inactive';

    private ConnectionInterface $legacy;

    /** @var array<int, true> */
    private array $agents = [];

    private string $today;

    /** @var array<int, array{0: int|string, 1: string}> [legacy id, reason] */
    private array $skipped = [];

    private array $stats = [
        'teams' => 0, 'teams_with_past_leader' => 0, 'sub_teams' => 0, 'sub_teams_leader_from_members' => 0,
        'team_memberships' => 0, 'team_memberships_active' => 0, 'sub_team_memberships' => 0,
        'sub_team_memberships_active' => 0, 'duplicates_merged' => 0, 'memberships_without_agent' => 0,
        'already_imported' => 0,
    ];

    public function __construct()
    {
        $this->legacy = DB::connection('legacy');
    }

    /**
     * @return array{stats: array<string, int>, skipped: array<int, array{0: int|string, 1: string}>}
     */
    public function run(bool $dryRun = false): array
    {
        $this->today = Carbon::today()->toDateString();
        $this->agents = array_fill_keys(DB::table('agents')->pluck('id')->all(), true);

        DB::beginTransaction();

        try {
            $teamIds = $this->importTeams();
            $this->importTeamMemberships($teamIds);
            $subTeamIds = $this->importSubTeams($teamIds);
            $this->importSubTeamMemberships($subTeamIds);

            $dryRun ? DB::rollBack() : DB::commit();
        } catch (Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        return ['stats' => $this->stats, 'skipped' => $this->skipped];
    }

    /**
     * @return array<int, string> id => status of teams created in this run
     */
    private function importTeams(): array
    {
        $existing = DB::table('teams')->pluck('id')->flip()->all();
        $members = $this->legacy->table('sales_team_members')
            ->where('isleader', 1)
            ->get(['teamid', 'memid', 'datejoined', 'dateresigned', 'activeTeam', 'id'])
            ->groupBy('teamid');

        $rows = [];
        foreach ($this->legacy->table('sales_team')->orderBy('id')->get() as $team) {
            if (isset($existing[$team->id])) {
                $this->stats['already_imported']++;
                continue;
            }

            [$leader, $current] = $this->teamLeader($members->get($team->id, collect()));

            if (! $leader) {
                $this->skipped[] = [$team->id, "team \"{$team->teamname}\" never had a leader who is an imported agent"];
                continue;
            }
            if (! $current) {
                $this->stats['teams_with_past_leader']++;
            }

            $created = $this->date($team->dateest) ?? $this->date($team->created_at) ?? now()->toDateString();
            $rows[] = [
                'id' => (int) $team->id,
                'name' => trim((string) $team->teamname),
                'logo' => str_starts_with((string) $team->teamlogo, 'http') ? mb_substr($team->teamlogo, 0, 255) : null,
                'status' => $this->teamStatus($team->status),
                'agent_id' => $leader,
                'created_at' => $created,
                'updated_at' => $created,
            ];
        }

        foreach (array_chunk($rows, 500) as $batch) {
            DB::table('teams')->insert($batch);
        }
        $this->stats['teams'] = count($rows);

        return array_column($rows, 'status', 'id');
    }

    /**
     * Current leader (isleader, activeTeam, end date not passed) — newest first; otherwise the most
     * recent leader the team ever had.
     *
     * @return array{0: ?int, 1: bool} [agent id, whether they are the current leader]
     */
    private function teamLeader(Collection $leaders): array
    {
        $leaders = $leaders
            ->filter(fn ($l) => isset($this->agents[(int) $l->memid]))
            ->sortByDesc(fn ($l) => [$this->date($l->datejoined) ?? '', $l->id]);

        $current = $leaders->first(fn ($l) => (int) $l->activeTeam === 1 && $this->stillOn($l->dateresigned));

        if ($current) {
            return [(int) $current->memid, true];
        }

        return [$leaders->first() ? (int) $leaders->first()->memid : null, false];
    }

    /**
     * @param  array<int, string>  $teamIds  id => status
     */
    private function importTeamMemberships(array $teamIds): void
    {
        $rows = $this->legacy->table('sales_team_members')
            ->whereIn('teamid', array_keys($teamIds) ?: [0])
            ->orderBy('id')
            ->get(['id', 'teamid', 'memid', 'datejoined', 'dateresigned', 'activeTeam', 'created_at'])
            ->map(fn ($r) => (object) [
                'id' => (int) $r->id,
                'group' => (int) $r->teamid,
                'agent' => (int) $r->memid,
                'joined' => $this->date($r->datejoined) ?? $this->date($r->created_at),
                'ends' => $this->date($r->dateresigned),
                'flag' => (int) $r->activeTeam === 1 && $teamIds[(int) $r->teamid] === self::ACTIVE,
            ]);

        $this->insertMemberships($rows, 'team_agents', 'team_id', 'team_memberships');
    }

    /**
     * @param  array<int, string>  $teamIds
     * @return array<int, string> id => status of sub-teams created in this run
     */
    private function importSubTeams(array $teamIds): array
    {
        $existing = DB::table('sub_teams')->pluck('id')->flip()->all();
        $memberLeaders = $this->legacy->table('salesteam_subteam_members')
            ->where('isLeader', 1)
            ->orderByDesc('id')
            ->get(['subTeamID', 'memID'])
            ->groupBy('subTeamID');

        $rows = [];
        foreach ($this->legacy->table('salesteam_subteam')->orderBy('sid')->get() as $sub) {
            if (isset($existing[$sub->sid])) {
                $this->stats['already_imported']++;
                continue;
            }
            if (! isset($teamIds[(int) $sub->tteamID]) && ! DB::table('teams')->where('id', $sub->tteamID)->exists()) {
                $this->skipped[] = [$sub->sid, "sub-team \"{$sub->teamName}\" belongs to a team that wasn't imported"];
                continue;
            }

            // LeadID is the sub-team's leader; fall back to its newest isLeader member if LeadID wasn't imported.
            $leader = isset($this->agents[(int) $sub->LeadID]) ? (int) $sub->LeadID : null;
            if (! $leader) {
                $leader = $memberLeaders->get($sub->sid, collect())->map(fn ($m) => (int) $m->memID)->first(fn ($id) => isset($this->agents[$id]));
                if ($leader) {
                    $this->stats['sub_teams_leader_from_members']++;
                }
            }
            if (! $leader) {
                $this->skipped[] = [$sub->sid, "sub-team \"{$sub->teamName}\" has no leader who is an imported agent"];
                continue;
            }

            $status = strtolower(trim((string) $sub->status));
            $created = $this->date($sub->created_at) ?? now()->toDateString();
            $rows[] = [
                'id' => (int) $sub->sid,
                'team_id' => (int) $sub->tteamID,
                'name' => trim((string) $sub->teamName),
                'status' => in_array($status, [self::ACTIVE, self::INACTIVE], true) ? $status : self::INACTIVE,
                'agent_id' => $leader,
                'created_at' => $created,
                'updated_at' => $this->date($sub->updated_at) ?? $created,
            ];
        }

        foreach (array_chunk($rows, 500) as $batch) {
            DB::table('sub_teams')->insert($batch);
        }
        $this->stats['sub_teams'] = count($rows);

        return array_column($rows, 'status', 'id');
    }

    /**
     * @param  array<int, string>  $subTeamIds  id => status
     */
    private function importSubTeamMemberships(array $subTeamIds): void
    {
        $rows = $this->legacy->table('salesteam_subteam_members')
            ->whereIn('subTeamID', array_keys($subTeamIds) ?: [0])
            ->orderBy('id')
            ->get(['id', 'subTeamID', 'memID', 'dateresigned', 'created_at'])
            ->map(fn ($r) => (object) [
                'id' => (int) $r->id,
                'group' => (int) $r->subTeamID,
                'agent' => (int) $r->memID,
                // Sub-team rows have no join date; the row's creation date is when they were added.
                'joined' => $this->date($r->created_at),
                'ends' => $this->date($r->dateresigned),
                // Nobody is still on a sub-team that has itself been closed.
                'flag' => $subTeamIds[(int) $r->subTeamID] === self::ACTIVE,
            ]);

        $this->insertMemberships($rows, 'sub_team_agents', 'sub_team_id', 'sub_team_memberships');
    }

    /**
     * Turns one legacy membership history into rows with a single active membership per agent.
     *
     * @param  Collection<int, object{id: int, group: int, agent: int, joined: ?string, ends: ?string, flag: bool}>  $rows
     */
    private function insertMemberships(Collection $rows, string $table, string $groupColumn, string $stat): void
    {
        $now = now();
        $insert = [];

        foreach ($rows->groupBy('agent') as $agentId => $history) {
            if (! isset($this->agents[(int) $agentId])) {
                $this->stats['memberships_without_agent'] += $history->count();
                continue;
            }

            // The same agent + group + join date repeated is one membership recorded twice.
            $unique = $history->unique(fn ($r) => $r->group.'|'.$r->joined);
            $this->stats['duplicates_merged'] += $history->count() - $unique->count();

            $ordered = $unique->sortBy(fn ($r) => [$r->joined ?? '', $r->id])->values();
            $last = $ordered->count() - 1;

            foreach ($ordered as $i => $r) {
                $next = $ordered->get($i + 1);
                $isLatest = $i === $last;
                $active = $isLatest && $r->flag && $this->stillOn($r->ends);

                $insert[] = [
                    $groupColumn => $r->group,
                    'agent_id' => (int) $agentId,
                    'joined_at' => $r->joined,
                    // Left for the next team → the day that started; otherwise the end date once it has passed.
                    'transferred_at' => $active ? null : ($next?->joined ?? ($r->ends && $r->ends < $this->today ? $r->ends : null)),
                    'status' => $active ? self::ACTIVE : self::INACTIVE,
                    'created_at' => $r->joined ?? $now,
                    'updated_at' => $now,
                ];

                if ($active) {
                    $this->stats[$stat.'_active']++;
                }
            }
        }

        foreach (array_chunk($insert, 1000) as $batch) {
            DB::table($table)->insert($batch);
        }
        $this->stats[$stat] = count($insert);
    }

    // Legacy "resigned" teams were closed for good, which is "deactivated" here.
    private function teamStatus(mixed $legacy): string
    {
        return match (strtolower(trim((string) $legacy))) {
            '', self::ACTIVE => self::ACTIVE,
            'resigned' => Team::STATUS_DEACTIVATED,
            default => self::INACTIVE,
        };
    }

    private function stillOn(mixed $endDate): bool
    {
        $end = $this->date($endDate);

        // No end date at all means open-ended; an end date today or later means still on the team.
        return $end === null || $end >= $this->today;
    }

    private function date(mixed $value): ?string
    {
        $value = trim((string) $value);

        if ($value === '' || str_starts_with($value, '0000')) {
            return null;
        }

        try {
            $date = Carbon::parse($value);
        } catch (Throwable) {
            return null;
        }

        return $date->year >= 1990 && $date->year <= 2100 ? $date->toDateString() : null;
    }
}
