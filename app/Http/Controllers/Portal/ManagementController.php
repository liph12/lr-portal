<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\Management\ChangeAgentStatusRequest;
use App\Http\Requests\Portal\Management\ChangeAgentTypeRequest;
use App\Http\Requests\Portal\Management\UpdateDesignationRequest;
use App\Http\Requests\Portal\Management\ChangeTeamStatusRequest;
use App\Http\Requests\Portal\Management\SaveSubTeamRequest;
use App\Http\Requests\Portal\Management\SaveTeamRequest;
use App\Http\Requests\Portal\Management\TransferAgentRequest;
use App\Http\Requests\Portal\Management\UploadPhotoRequest;
use App\Models\Entities\Agent;
use App\Models\Entities\SubTeam;
use App\Models\Entities\Team;
use App\Models\User;
use App\Services\AgentDesignationService;
use App\Services\PersonDetailsService;
use App\Services\ProfilePhotoService;
use App\Services\TeamDirectoryService;
use App\Services\TeamManagementService;
use App\Services\UserAccountService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Carbon;

// Management for the superadmin and admin portals (same pages, each under its own prefix).
class ManagementController extends Controller
{
    public function __construct(
        private TeamDirectoryService $directory,
        private TeamManagementService $teams,
    ) {}

    public function teams()
    {
        return inertia('Portal/Management/Teams', [
            'teams' => $this->directory->teams(),
            'statuses' => Team::STATUSES,
        ]);
    }

    public function subTeams()
    {
        return inertia('Portal/Management/SubTeams', [
            'subTeams' => $this->directory->subTeams(),
            'teams' => $this->directory->teamOptions(),
            'statuses' => Team::STATUSES,
        ]);
    }

    public function agents(Request $request, PersonDetailsService $people)
    {
        $filters = $request->only(['q', 'status', 'team_id', 'agent_type', 'designation', 'membership', 'registration', 'sort', 'dir', 'per_page']);

        return inertia('Portal/Management/Agents', [
            'agents' => $this->page($this->directory->agents($filters)),
            'filters' => $filters,
            'teams' => $this->directory->teamOptions(),
            'statuses' => User::STATUSES,
            'agentTypes' => Agent::TYPES,
            'areas' => collect(config('areas'))->map(fn ($a) => $a['name']),
            // A clicked agent's details for the side panel (same as the search results show), loaded on demand.
            'agentDetail' => Inertia::optional(function () use ($request, $people) {
                $agent = Agent::with('user:id,last_active_at')->find((int) $request->query('agent'));
                abort_unless($agent, 404);

                return [
                    'agent_id' => $agent->id,
                    'details' => $people->for([$agent->id])[$agent->id] ?? null,
                    'last_active_at' => $agent->user?->last_active_at ? (string) $agent->user->last_active_at : null,
                ];
            }),
        ]);
    }

    public function transfers(Request $request)
    {
        $filters = $request->only(['q', 'team_id', 'sort', 'dir', 'per_page']);

        return inertia('Portal/Management/Transfers', [
            'transfers' => $this->page($this->directory->transfers($filters)),
            'filters' => $filters,
            'teams' => $this->directory->teamOptions(),
        ]);
    }

    public function storeTeam(SaveTeamRequest $request)
    {
        $team = $this->teams->saveTeam(null, $request->validated());

        return back()->with('success', "Team {$team->name} created.");
    }

    public function updateTeam(SaveTeamRequest $request, Team $team)
    {
        $this->teams->saveTeam($team, $request->validated());

        return back()->with('success', "Team {$team->name} saved.");
    }

    public function teamStatus(ChangeTeamStatusRequest $request, Team $team)
    {
        $this->teams->changeTeamStatus($team, $request->validated('status'));

        return back()->with('success', "{$team->name} is now {$team->status}.");
    }

    public function teamLogo(UploadPhotoRequest $request, Team $team)
    {
        $this->teams->replaceLogo($team, $request->file('photo'));

        return back()->with('success', "Photo of {$team->name} updated.");
    }

    public function storeSubTeam(SaveSubTeamRequest $request)
    {
        $subTeam = $this->teams->saveSubTeam(null, $request->validated());

        return back()->with('success', "Sub-team {$subTeam->name} created.");
    }

    public function updateSubTeam(SaveSubTeamRequest $request, SubTeam $subTeam)
    {
        $this->teams->saveSubTeam($subTeam, $request->validated());

        return back()->with('success', "Sub-team {$subTeam->name} saved.");
    }

    public function subTeamStatus(ChangeTeamStatusRequest $request, SubTeam $subTeam)
    {
        $this->teams->changeSubTeamStatus($subTeam, $request->validated('status'));

        return back()->with('success', "{$subTeam->name} is now {$subTeam->status}.");
    }

    public function subTeamLogo(UploadPhotoRequest $request, SubTeam $subTeam)
    {
        $this->teams->replaceLogo($subTeam, $request->file('photo'));

        return back()->with('success', "Photo of {$subTeam->name} updated.");
    }

    public function agentStatus(ChangeAgentStatusRequest $request, Agent $agent, UserAccountService $accounts)
    {
        $accounts->changeStatus($request->user(), $agent->user, $request->validated('status'));

        return back()->with('success', "{$agent->user->name} is now {$request->validated('status')}.");
    }

    public function agentType(ChangeAgentTypeRequest $request, Agent $agent)
    {
        $this->teams->changeAgentType($agent, $request->validated('agent_type'));

        return back()->with('success', "{$agent->user?->name} is now a ".str_replace('_', ' ', $agent->agent_type).'.');
    }

    public function agentDesignation(UpdateDesignationRequest $request, Agent $agent, AgentDesignationService $designations)
    {
        $designations->update($request->user(), $agent, $request->validated());

        return back()->with('success', "Designation of {$agent->user?->name} saved.");
    }

    public function agentPhoto(UploadPhotoRequest $request, Agent $agent, ProfilePhotoService $photos)
    {
        $photos->replace($agent->user, $request->file('photo'), "Updated {$agent->user->name}'s profile photo");

        return back()->with('success', "Photo of {$agent->user->name} updated.");
    }

    public function transfer(TransferAgentRequest $request, Agent $agent)
    {
        $team = Team::findOrFail($request->validated('team_id'));
        $subTeam = $request->validated('sub_team_id') ? SubTeam::findOrFail($request->validated('sub_team_id')) : null;

        $this->teams->transfer($agent, $team, $subTeam, Carbon::parse($request->validated('date')));

        return back()->with('success', "{$agent->user?->name} moved to {$team->name}.");
    }

    /**
     * @return array{data: array<int, mixed>, total: int, page: int, per_page: int}
     */
    private function page(LengthAwarePaginator $page): array
    {
        return [
            'data' => $page->items(),
            'total' => $page->total(),
            'page' => $page->currentPage(),
            'per_page' => $page->perPage(),
        ];
    }
}
