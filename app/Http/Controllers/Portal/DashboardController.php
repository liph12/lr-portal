<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Entities\AgentTransaction;
use App\Models\Entities\InternationalSale;
use App\Services\SalesReportService;
use App\Services\SalesEncodingService;
use App\Services\TeamLeadershipService;
use Illuminate\Http\Request;

// The dashboard every signed-in role shares (/dashboard/...); only Record Your Sale is permission-gated.
class DashboardController extends Controller
{

    public function index()
    {
        return inertia('Portal/Dashboard/Index');
    }

    // Sales at a glance: the back office sees the whole system, team leaders / unit managers their own team or
    // sub-team (other roles don't get this page). Opens on this year; the date range changes it.
    public function overview(Request $request, TeamLeadershipService $leadership, SalesReportService $reports)
    {
        $lock = $leadership->reportScope($request->user());
        abort_if($lock === false || isset($lock['agent_id']), 403);

        $filters = $reports->lockedFilters(['view' => 'agents', 'per_page' => 25] + $request->query(), $lock);
        // Back office ranks teams; a team leader ranks their sub-teams; a unit manager's sub-team has nothing below it.
        $groupView = match (true) {
            $lock === null => 'teams',
            isset($lock['team_id']) => 'sub_teams',
            default => null,
        };

        return inertia('Portal/Dashboard/Overview/Index', [
            'filters' => $filters,
            'scope' => fn () => $reports->scope($filters),
            'summary' => fn () => $reports->summary($filters),
            'topAgents' => fn () => array_slice($reports->breakdown($filters)->items(), 0, 5),
            'topGroups' => fn () => $groupView
                ? ['view' => $groupView, 'rows' => array_slice($reports->breakdown(['view' => $groupView] + $filters)->items(), 0, 5)]
                : null,
        ]);
    }

    public function recordSale(Request $request, SalesEncodingService $encoding)
    {
        $can = [
            'local' => $request->user()->can('create', AgentTransaction::class),
            'international' => $request->user()->can('create', InternationalSale::class),
        ];
        abort_unless($can['local'] || $can['international'], 403);

        return inertia('Portal/Dashboard/RecordSale/Index', ['encoding' => $encoding->state(), 'can' => $can]);
    }
}
