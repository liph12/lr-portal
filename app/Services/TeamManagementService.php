<?php

namespace App\Services;

use App\Models\Entities\Agent;
use App\Models\Entities\SubTeam;
use App\Models\Entities\SubTeamAgent;
use App\Models\Entities\Team;
use App\Models\Entities\TeamAgent;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

// Teams, sub-teams and moving agents between them. Membership history is never rewritten: a
// transfer closes the current stint (status inactive, transferred_at) and opens a new one.
class TeamManagementService
{
    public function __construct(
        private ProfilePhotoService $photos,
        private ActivityLogger $activity,
    ) {}

    /**
     * @param  array{name: string, agent_id: int, status: string}  $data
     */
    public function saveTeam(?Team $team, array $data): Team
    {
        $creating = ! $team;
        $team ??= new Team(['status' => Team::STATUS_ACTIVE]);
        $previousStatus = $team->status;

        DB::transaction(function () use ($team, $data, $previousStatus) {
            $team->fill(['name' => $data['name'], 'agent_id' => $data['agent_id']])->save();
            $this->applyTeamStatus($team, $data['status'], $previousStatus);
        });

        $this->activity->describe(
            $creating ? 'team.created' : 'team.updated',
            ($creating ? 'Created' : 'Updated')." team {$team->name}",
            $team,
            ['status' => $team->status, 'leader_agent_id' => $team->agent_id],
        );

        return $team;
    }

    public function changeTeamStatus(Team $team, string $status): void
    {
        $previous = $team->status;

        if ($previous === $status) {
            return;
        }

        DB::transaction(fn () => $this->applyTeamStatus($team, $status, $previous));

        $this->activity->describe('team.status_changed', "Changed team {$team->name} from {$previous} to {$status}", $team, [
            'from' => $previous,
            'to' => $status,
        ]);
    }

    /**
     * @param  array{team_id: int, name: string, agent_id: int, status: string}  $data
     */
    public function saveSubTeam(?SubTeam $subTeam, array $data): SubTeam
    {
        $creating = ! $subTeam;
        $subTeam ??= new SubTeam;
        $previousStatus = $subTeam->status;

        DB::transaction(function () use ($subTeam, $data, $previousStatus) {
            $subTeam->fill(['team_id' => $data['team_id'], 'name' => $data['name'], 'agent_id' => $data['agent_id']])->save();
            $this->applySubTeamStatus($subTeam, $data['status'], $previousStatus);
        });

        $this->activity->describe(
            $creating ? 'sub_team.created' : 'sub_team.updated',
            ($creating ? 'Created' : 'Updated')." sub-team {$subTeam->name}",
            $subTeam,
            ['team_id' => $subTeam->team_id, 'status' => $subTeam->status, 'leader_agent_id' => $subTeam->agent_id],
        );

        return $subTeam;
    }

    public function changeSubTeamStatus(SubTeam $subTeam, string $status): void
    {
        $previous = $subTeam->status;

        if ($previous === $status) {
            return;
        }

        DB::transaction(fn () => $this->applySubTeamStatus($subTeam, $status, $previous));

        $this->activity->describe('sub_team.status_changed', "Changed sub-team {$subTeam->name} from {$previous} to {$status}", $subTeam, [
            'from' => $previous,
            'to' => $status,
        ]);
    }

    public function replaceLogo(Team|SubTeam $group, UploadedFile $photo): string
    {
        $kind = $group instanceof Team ? 'team' : 'sub-team';
        [$url, $bytesStored] = $this->photos->uploadSquare($photo, "team-logos/{$kind}/{$group->id}");
        $previous = $group->logo;

        $group->update(['logo' => $url]);
        $this->photos->deleteStored($previous);

        $this->activity->describe(str_replace('-', '_', $kind).'.logo_updated', "Updated the photo of {$kind} {$group->name}", $group, [
            'logo' => $url,
            'bytes_uploaded' => $photo->getSize(),
            'bytes_stored' => $bytesStored,
        ]);

        return $url;
    }

    /**
     * Moves an agent to a team (and optionally one of its sub-teams) from the given date.
     */
    public function transfer(Agent $agent, Team $team, ?SubTeam $subTeam, Carbon $date): void
    {
        if ($team->status !== Team::STATUS_ACTIVE) {
            throw ValidationException::withMessages(['team_id' => "{$team->name} isn't active. Activate it before moving agents in."]);
        }
        if ($subTeam && ($subTeam->team_id !== $team->id || $subTeam->status !== Team::STATUS_ACTIVE)) {
            throw ValidationException::withMessages(['sub_team_id' => 'Pick an active sub-team of the selected team.']);
        }

        $currentTeam = $this->current(TeamAgent::query(), $agent);
        $currentSubTeam = $this->current(SubTeamAgent::query(), $agent);

        $joined = $date->toDateString();
        if (($currentTeam && substr((string) $currentTeam->joined_at, 0, 10) > $joined) || ($currentSubTeam && substr((string) $currentSubTeam->joined_at, 0, 10) > $joined)) {
            throw ValidationException::withMessages(['date' => 'The transfer date is before the agent joined their current team.']);
        }

        $sameTeam = $currentTeam?->team_id === $team->id;
        $sameSubTeam = $currentSubTeam?->sub_team_id === $subTeam?->id;

        if ($sameTeam && $sameSubTeam) {
            throw ValidationException::withMessages(['team_id' => 'The agent is already on this team.']);
        }

        DB::transaction(function () use ($agent, $team, $subTeam, $joined, $currentTeam, $currentSubTeam, $sameTeam, $sameSubTeam) {
            if (! $sameTeam) {
                $currentTeam?->update(['status' => TeamAgent::STATUS_INACTIVE, 'transferred_at' => $joined]);
                TeamAgent::create(['team_id' => $team->id, 'agent_id' => $agent->id, 'joined_at' => $joined, 'status' => TeamAgent::STATUS_ACTIVE]);
            }

            if (! $sameSubTeam) {
                $currentSubTeam?->update(['status' => SubTeamAgent::STATUS_INACTIVE, 'transferred_at' => $joined]);
                if ($subTeam) {
                    SubTeamAgent::create(['sub_team_id' => $subTeam->id, 'agent_id' => $agent->id, 'joined_at' => $joined, 'status' => SubTeamAgent::STATUS_ACTIVE]);
                }
            }
        });

        $name = $agent->user?->name ?? "agent #{$agent->id}";
        $this->activity->describe('team.agent_transferred', "Moved {$name} to {$team->name}".($subTeam ? " / {$subTeam->name}" : ''), $agent, [
            'from_team_id' => $currentTeam?->team_id,
            'to_team_id' => $team->id,
            'from_sub_team_id' => $currentSubTeam?->sub_team_id,
            'to_sub_team_id' => $subTeam?->id,
            'date' => $joined,
        ]);
    }

    public function changeAgentType(Agent $agent, string $type): void
    {
        $previous = $agent->agent_type;

        if ($previous === $type) {
            return;
        }

        $agent->forceFill(['agent_type' => $type])->save();

        $name = $agent->user?->name ?? "agent #{$agent->id}";
        $this->activity->describe('agent.type_changed', "Changed {$name} from {$previous} to {$type}", $agent, ['from' => $previous, 'to' => $type]);
    }

    // Deactivating closes the team for good: its members and sub-teams are let go from today.
    private function applyTeamStatus(Team $team, string $status, ?string $previous): void
    {
        $team->update(['status' => $status]);

        if ($status !== Team::STATUS_DEACTIVATED || $previous === Team::STATUS_DEACTIVATED) {
            return;
        }

        $this->closeMemberships(TeamAgent::where('team_id', $team->id));

        foreach ($team->subTeams()->where('status', '!=', Team::STATUS_DEACTIVATED)->get() as $subTeam) {
            $this->applySubTeamStatus($subTeam, Team::STATUS_DEACTIVATED, $subTeam->status);
        }
    }

    private function applySubTeamStatus(SubTeam $subTeam, string $status, ?string $previous): void
    {
        $subTeam->update(['status' => $status]);

        if ($status === Team::STATUS_DEACTIVATED && $previous !== Team::STATUS_DEACTIVATED) {
            $this->closeMemberships(SubTeamAgent::where('sub_team_id', $subTeam->id));
        }
    }

    private function closeMemberships($memberships): void
    {
        $memberships->where('status', TeamAgent::STATUS_ACTIVE)->update([
            'status' => TeamAgent::STATUS_INACTIVE,
            'transferred_at' => today()->toDateString(),
            'updated_at' => now(),
        ]);
    }

    private function current($memberships, Agent $agent): TeamAgent|SubTeamAgent|null
    {
        return $memberships->where('agent_id', $agent->id)->where('status', TeamAgent::STATUS_ACTIVE)->latest('joined_at')->first();
    }
}
