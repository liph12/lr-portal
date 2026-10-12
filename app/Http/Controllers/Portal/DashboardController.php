<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Entities\AgentTransaction;
use App\Models\Entities\InternationalSale;
use App\Services\SaleValidationService;
use App\Services\ProfileService;
use App\Services\SalesReportService;
use App\Services\SalesEncodingService;
use App\Services\TeamLeadershipService;
use Illuminate\Http\Request;

// The dashboard every signed-in role shares (/dashboard/...); only Record Your Sale is permission-gated.
class DashboardController extends Controller
{

    // "Your links" needs an agent record (the contact slug lives on it), so one is created here on first use like /profile.
    public function index(Request $request, ProfileService $profiles)
    {
        $profiles->agentFor($request->user());

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
            // An office area ranks the teams with members there (only those members' sales count).
            $lock === null, isset($lock['area']) => 'teams',
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

    // My Sales: the signed-in agent's own sales one by one (any category), with their statistics. Personal — no
    // permission beyond having an agent record.
    public function mySales(Request $request, SalesReportService $reports)
    {
        $agentId = $request->user()->agent()->value('id');
        abort_unless($agentId, 403);

        // Their own sales only: the agent lock wins over anything in the URL.
        $filters = $reports->lockedFilters(['view' => 'agents', 'list' => 'sales'] + $request->query(), ['agent_id' => (int) $agentId]);

        return inertia('Portal/Dashboard/MySales/Index', [
            'filters' => $filters,
            'summary' => fn () => $reports->summary($filters),
            'totals' => fn () => $reports->categoryTotals($filters),
            'saleList' => function () use ($reports, $filters) {
                $page = $reports->saleList($filters);

                return ['data' => $page->items(), 'total' => $page->total(), 'page' => $page->currentPage(), 'per_page' => $page->perPage()];
            },
            'saleDetail' => fn () => ($sale = (int) $request->query('sale')) && $reports->containsSale($filters, $sale)
                ? app(SaleValidationService::class)->detail($sale)
                : null,
            'options' => ['categories' => SalesReportService::CATEGORIES, 'statuses' => SalesReportService::STATUSES],
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
