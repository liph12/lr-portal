<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Entities\Agent;
use App\Models\Entities\Team;
use App\Services\SalesReportService;
use App\Support\Areas;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// A read-only agent profile, opened from the reports. For people who read reports or manage teams.
class AgentProfileController extends Controller
{
    public function __construct(private SalesReportService $reports) {}

    public function show(Request $request, Agent $agent)
    {
        abort_unless($request->user()->can('view_reports') || $request->user()->can('manage', Team::class), 403);

        $agent->load('user:id,name,email,status');
        $filters = $this->reports->filters(['view' => 'agents', 'agent_id' => $agent->id] + $request->only(['from', 'to', 'status']));

        $memberships = fn (string $table, string $groups, string $column) => DB::table("{$table} as m")
            ->join("{$groups} as g", 'g.id', '=', "m.{$column}")
            ->where('m.agent_id', $agent->id)
            ->orderByDesc('m.joined_at')
            ->get(['g.id', 'g.name', 'm.joined_at', 'm.transferred_at', 'm.status']);

        return inertia('Portal/Agents/Show', [
            'agent' => [
                'id' => $agent->id,
                'name' => $agent->user?->name ?? trim("{$agent->first_name} {$agent->last_name}"),
                'avatar' => $agent->avatar,
                'email' => $agent->user?->email ?? $agent->email,
                'mobile' => $agent->mobile,
                'status' => $agent->user?->status,
                'role' => $agent->user?->roles()->value('label'),
                'agent_type' => $agent->agent_type,
                'area' => $agent->area ? Areas::name($agent->area) : null,
                'city' => $agent->city,
                'state' => $agent->state,
                'country' => $agent->country,
                'country_code' => $agent->country_code,
            ],
            'teams' => $memberships('team_agents', 'teams', 'team_id'),
            'subTeams' => $memberships('sub_team_agents', 'sub_teams', 'sub_team_id'),
            'filters' => $filters,
            'summary' => fn () => $this->reports->summary($filters),
        ]);
    }
}
