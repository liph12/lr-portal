<?php

namespace App\Services;

use App\Models\Entities\Agent;
use App\Models\Entities\SubTeam;
use App\Models\Entities\SubTeamAgent;
use App\Models\Entities\Team;
use App\Models\Entities\TeamAgent;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

// An agent's upline (sponsor = agent_attributes.referral_id, the sponsor's agent id). Changing it also moves the agent onto
// the upline's team and sub-team — or just the team when the upline has no sub-team there — through the normal transfer,
// so the team history is kept.
class AgentUplineService
{
    // Deep enough for any real chain; a guard against legacy loops.
    private const MAX_DEPTH = 200;

    public function __construct(private TeamManagementService $teams, private ActivityLogger $activity) {}

    /**
     * Where the upline belongs now: their active team (or the one they lead) and, inside it, their sub-team (or the one
     * they lead).
     *
     * @return array{team: ?Team, sub_team: ?SubTeam}
     */
    public function placementOf(Agent $upline): array
    {
        $teamId = TeamAgent::where('agent_id', $upline->id)->where('status', TeamAgent::STATUS_ACTIVE)->latest('joined_at')->value('team_id')
            ?? Team::where('agent_id', $upline->id)->where('status', Team::STATUS_ACTIVE)->value('id');
        $team = $teamId ? Team::find($teamId) : null;
        if (! $team) {
            return ['team' => null, 'sub_team' => null];
        }

        $subTeamId = SubTeamAgent::query()
            ->join('sub_teams as s', 's.id', '=', 'sub_team_agents.sub_team_id')
            ->where('sub_team_agents.agent_id', $upline->id)->where('sub_team_agents.status', SubTeamAgent::STATUS_ACTIVE)
            ->where('s.team_id', $team->id)->where('s.status', Team::STATUS_ACTIVE)
            ->latest('sub_team_agents.joined_at')->value('s.id')
            ?? SubTeam::where('agent_id', $upline->id)->where('team_id', $team->id)->where('status', Team::STATUS_ACTIVE)->value('id');

        return ['team' => $team, 'sub_team' => $subTeamId ? SubTeam::find($subTeamId) : null];
    }

    /**
     * @return array{team: ?Team, sub_team: ?SubTeam, moved: bool}
     */
    public function change(Agent $agent, Agent $upline, Carbon $date): array
    {
        if ($upline->id === $agent->id) {
            throw ValidationException::withMessages(['upline_id' => 'An agent can\'t be their own upline.']);
        }
        if ($this->isBelow($upline->id, $agent->id)) {
            throw ValidationException::withMessages(['upline_id' => 'That agent is in this agent\'s downline; they can\'t become their upline.']);
        }

        $previous = DB::table('agent_attributes')->where('agent_id', $agent->id)->value('referral_id');
        $placement = $this->placementOf($upline);

        $moved = DB::transaction(function () use ($agent, $upline, $date, $placement) {
            DB::table('agent_attributes')->updateOrInsert(['agent_id' => $agent->id], ['referral_id' => $upline->id, 'updated_at' => now()]);

            if (! $placement['team']) {
                return false;
            }
            $onTeam = TeamAgent::where('agent_id', $agent->id)->where('status', TeamAgent::STATUS_ACTIVE)->where('team_id', $placement['team']->id)->exists();
            $onSubTeam = $placement['sub_team']
                ? SubTeamAgent::where('agent_id', $agent->id)->where('status', SubTeamAgent::STATUS_ACTIVE)->where('sub_team_id', $placement['sub_team']->id)->exists()
                : ! SubTeamAgent::where('agent_id', $agent->id)->where('status', SubTeamAgent::STATUS_ACTIVE)->exists();
            if ($onTeam && $onSubTeam) {
                return false;
            }

            $this->teams->transfer($agent, $placement['team'], $placement['sub_team'], $date);

            return true;
        });

        $name = $agent->user?->name ?? "agent #{$agent->id}";
        $uplineName = $upline->user?->name ?? "agent #{$upline->id}";
        $this->activity->describe('agent.upline_changed', "Changed {$name}'s upline to {$uplineName}", $agent, [
            'from_upline_id' => $previous ? (int) $previous : null,
            'to_upline_id' => $upline->id,
            'moved_to_team_id' => $moved ? $placement['team']?->id : null,
            'moved_to_sub_team_id' => $moved ? $placement['sub_team']?->id : null,
            'date' => $date->toDateString(),
        ]);

        return [...$placement, 'moved' => $moved];
    }

    // Whether $candidate sits somewhere under $agent (so making them the upline would close a loop).
    private function isBelow(int $candidate, int $agent): bool
    {
        $seen = [];
        for ($id = $candidate, $depth = 0; $id && $depth < self::MAX_DEPTH; $depth++) {
            if ($id === $agent) {
                return true;
            }
            if (isset($seen[$id])) {
                return false;
            }
            $seen[$id] = true;
            $id = (int) DB::table('agent_attributes')->where('agent_id', $id)->value('referral_id');
        }

        return false;
    }
}
