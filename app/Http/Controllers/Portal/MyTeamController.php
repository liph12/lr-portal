<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Entities\Agent;
use App\Models\Entities\SubTeam;
use App\Models\Entities\Team;
use App\Services\RecruitmentService;
use App\Services\SalesReportService;
use App\Services\TeamLeadershipService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;

// My Team: a team leader's or unit manager's own report, members and (team leaders) sub-teams.
class MyTeamController extends Controller
{
    public function __construct(
        private TeamLeadershipService $leadership,
        private SalesReportService $reports,
    ) {}

    public function index(Request $request)
    {
        $current = $this->current($request);
        $scopeKey = $current['type'] === 'team' ? 'team_id' : 'sub_team_id';

        // Opens on last month's top agents; the date range changes it.
        $input = $this->range($request) + $request->except(['team_id', 'sub_team_id', 'developer_id', 'area', 'agent_id', 'view', 'team', 'sub_team', 'from', 'to']);
        $filters = $this->reports->filters(['view' => 'agents', $scopeKey => $current['group']->id] + $input);

        return inertia('Portal/MyTeam/Index', [
            ...$this->shared($request, $current),
            'filters' => $filters,
            'scope' => fn () => $this->reports->scope($filters),
            'summary' => fn () => $this->reports->summary($filters),
            'breakdown' => function () use ($filters) {
                $page = $this->reports->breakdown($filters);

                return ['data' => $page->items(), 'total' => $page->total(), 'page' => $page->currentPage(), 'per_page' => $page->perPage()];
            },
            'options' => [
                'categories' => SalesReportService::CATEGORIES,
                'statuses' => SalesReportService::STATUSES,
                'views' => ['agents'],
            ],
        ]);
    }

    public function members(Request $request)
    {
        $current = $this->current($request);

        $filters = $request->only(['q', 'page', 'per_page']);
        $page = $this->leadership->members($current['type'], $current['group'], $filters);

        return inertia('Portal/MyTeam/Members', [
            ...$this->shared($request, $current),
            'members' => ['data' => $page->items(), 'total' => $page->total(), 'page' => $page->currentPage(), 'per_page' => $page->perPage()],
            'memberCount' => $this->leadership->memberCount($current['type'], $current['group']),
            'filters' => $filters,
        ]);
    }

    public function subTeams(Request $request)
    {
        $current = $this->current($request);
        abort_unless($current['type'] === 'team', 403);
        $team = $current['group'];

        // Same dates as the overview: last month unless chosen.
        $range = $this->range($request);
        $base = ['team_id' => $team->id, 'status' => $request->query('status')] + $range;

        // Sub-team sales: members' sales credited to the sub-team they were on at the reservation date.
        $subTeamSales = $this->reports->totals($this->reports->filters(['view' => 'sub_teams'] + $base));
        // A unit manager's own sales (inside this team).
        $personalSales = $this->reports->totals($this->reports->filters(['view' => 'agents'] + $base));

        $rows = collect($this->leadership->subTeamsOf($team))->map(fn (array $s) => [
            ...$s,
            'sales' => $subTeamSales[$s['id']] ?? 0.0,
            'leader_sales' => $personalSales[$s['agent_id']] ?? 0.0,
        ]);

        return inertia('Portal/MyTeam/SubTeams', [
            ...$this->shared($request, $current),
            'subTeams' => $rows->values(),
            'filters' => $range + ['status' => $this->reports->filters($base)['status']],
        ]);
    }

    // The same overview as the dashboard's, for this team or sub-team.
    public function recruits(Request $request, RecruitmentService $recruitment)
    {
        $current = $this->current($request);
        $scope = [$current['type'] === 'team' ? 'team_id' : 'sub_team_id' => $current['group']->id];

        return inertia('Portal/MyTeam/Recruits', [
            ...$this->shared($request, $current),
            ...$recruitment->props($request, $scope),
        ]);
    }

    /**
     * @return array{type: 'team'|'sub_team', group: Team|SubTeam, via?: Team}
     */
    private function current(Request $request): array
    {
        $current = $this->leadership->current($request->user(), $request->integer('team') ?: null, $request->integer('sub_team') ?: null);
        abort_unless($current !== null, 403, "You don't lead a team or sub-team.");

        return $current;
    }

    /**
     * @return array<string, mixed>
     */
    private function shared(Request $request, array $current): array
    {
        $group = $current['group'];

        return [
            'group' => [
                'type' => $current['type'],
                'id' => $group->id,
                'name' => $group->name,
                'logo' => $group->logo,
                'team' => $group instanceof SubTeam ? $group->team?->name : null,
                // Set when a team leader is looking at one of their team's sub-teams.
                'parent' => isset($current['via']) ? ['id' => $current['via']->id, 'name' => $current['via']->name] : null,
            ],
            // Team leaders manage; unit managers monitor.
            // A team leader's whole team (with its Sub-teams tab) rather than one sub-team. Nothing here changes anything:
            // members and sub-teams are managed in Management (superadmin / admin).
            'isTeam' => $current['type'] === 'team',
            'leads' => $this->leadership->summaryFor($request->user()),
        ];
    }

    /**
     * The chosen dates, or last month (a leader's usual question is "how did we do last month?").
     *
     * @return array{from: string, to: string}
     */
    private function range(Request $request): array
    {
        if ($request->filled('from') || $request->filled('to')) {
            $f = $this->reports->filters($request->only(['from', 'to']));

            return ['from' => $f['from'], 'to' => $f['to']];
        }

        $lastMonth = CarbonImmutable::today()->subMonthNoOverflow();

        return ['from' => $lastMonth->startOfMonth()->toDateString(), 'to' => $lastMonth->endOfMonth()->toDateString()];
    }
}
