<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\GenealogyService;
use App\Services\RecruitProgressService;
use App\Services\RecruitmentService;
use App\Services\SaleValidationService;
use App\Services\SalesReportService;
use App\Services\TeamLeadershipService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// Reports: a card per report, each opening its own page (date range, statistics, ranked table).
// Same data and the same reach as Dashboard › View Sales (TeamLeadershipService::reportScope), one report at a time.
class ReportsController extends Controller
{
    // URL slug => report view in SalesReportService.
    public const REPORTS = [
        'rental-sales' => 'rental',
        'brokerage-sales' => 'brokerage',
        'developer-sales' => 'developers',
        'top-teams' => 'teams',
        'top-sub-teams' => 'sub_teams',
        'area-sales' => 'areas',
        'top-agents' => 'agents',
        'top-unit-managers' => 'unit_managers',
        'top-team-leaders' => 'team_leaders',
        // The developer ranking with an area picker; a developer opens the agents who sold it there.
        'area-developers' => 'developers',
    ];

    // Each report is its own permission (Settings › Roles & permissions › Reports): "report_" + slug.
    public static function permission(string $slug): string
    {
        return 'report_'.str_replace('-', '_', $slug);
    }

    public function __construct(
        private SalesReportService $reports,
        private TeamLeadershipService $leadership,
    ) {}

    public function index(Request $request)
    {
        $lock = $this->leadership->reportScope($request->user());
        abort_if($lock === false, 403);

        return inertia('Portal/Reports/Index', ['available' => $this->available($lock, $request->user())]);
    }

    // Reports › Recruits: members, recruits and new sign-ups' NAO / FIRE progress (same reach as the sales reports;
    // an agent sees the recruits they sponsored).
    public function recruits(Request $request, RecruitmentService $recruitment, RecruitProgressService $progress)
    {
        $lock = $this->leadership->reportScope($request->user());
        abort_if($lock === false || ! $request->user()->can(self::permission('recruits')), 403);
        $selection = $this->selection($request, $lock);

        return inertia('Portal/Reports/Recruits', [
            ...$recruitment->props($request, $this->narrow($selection, $this->recruitLock($lock), $request->user())),
            // An agent's page is about them: name them in the header.
            ...(isset($lock['agent_id']) ? ['scope' => fn () => $this->reports->scope($this->reports->filters($lock))] : []),
            // Opened from Recruits Progress (a team / sub-team / sponsor): name it, and allow going back to everyone.
            'selection' => fn () => $progress->selectionHeader($selection),
        ]);
    }

    // Reports › Recruits Progress: recruits vs recruits who sold, their sales, NAO / FIRE, by team, unit manager or
    // sponsor. Same reach as Recruits.
    public function recruitsProgress(Request $request, RecruitProgressService $progress)
    {
        $lock = $this->leadership->reportScope($request->user());
        abort_if($lock === false || ! $request->user()->can(self::permission('recruits-progress')), 403);

        $selection = $this->selection($request, $lock);
        $scope = $this->narrow($selection, $this->recruitLock($lock), $request->user());
        $groups = $progress->groupsFor($scope);
        $filters = $progress->filters($request->query(), $groups ?: ['sponsors']) + $selection;

        return inertia('Portal/Reports/RecruitsProgress', [
            'filters' => $filters,
            'groups' => $groups,
            'scope' => fn () => $lock ? $this->reports->scope($this->reports->filters($lock)) : null,
            'selection' => fn () => $progress->selectionHeader($selection),
            'summary' => fn () => $progress->summary($filters, $scope),
            'rows' => function () use ($progress, $filters, $scope, $groups) {
                if (! $groups) {
                    return ['data' => [], 'total' => 0, 'page' => 1, 'per_page' => $filters['per_page']];
                }
                $page = $progress->table($filters, $scope);

                return ['data' => $page->items(), 'total' => $page->total(), 'page' => $page->currentPage(), 'per_page' => $page->perPage()];
            },
        ]);
    }

    public function show(Request $request, string $report)
    {
        abort_unless(isset(self::REPORTS[$report]), 404);

        $lock = $this->leadership->reportScope($request->user());
        abort_if($lock === false || ! $request->user()->can(self::permission($report)), 403);
        abort_unless(in_array($report, $this->available($lock, $request->user()), true), 404);
        $filters = $this->reports->lockedFilters(['view' => self::REPORTS[$report]] + $request->query(), $lock);

        // Inside a developer or a branch, its Top teams / Top sub-teams: for readers who see more than their own group — the
        // back office and office secretaries (their branch's members). A leader's lock would only rank their own group.
        $groupTabs = $lock === null || isset($lock['area']);
        if (in_array($filters['list'], ['teams', 'sub_teams'], true)) {
            if ($groupTabs && ($filters['developer_id'] || $filters['area'])) {
                $filters['view'] = $filters['list'];
            } else {
                $filters['list'] = null;
            }
        }

        return inertia('Portal/Reports/Show', [
            'report' => $report,
            'filters' => $filters,
            'groupTabs' => $groupTabs,
            'scopeLocked' => $lock !== null,
            // Developers by Area picks the area — for readers who see every area (a locked reader's group can't change).
            'areaOptions' => $report === 'area-developers' && $lock === null
                ? collect(config('areas'))->map(fn ($a) => $a['name'])
                : null,
            'scope' => fn () => $this->reports->scope($filters),
            'summary' => fn () => $this->reports->summary($filters),
            // A sale clicked in the Sales tab (?sale=ID), read-only — only one that's in this report and the reader's reach.
            'saleDetail' => fn () => ($sale = (int) $request->query('sale')) && $filters['list'] === 'sales' && $this->reports->containsSale($filters, $sale)
                ? app(SaleValidationService::class)->detail($sale)
                : null,
            // Inside a developer, the Sales tab: its sales one by one.
            'saleList' => function () use ($filters) {
                if ($filters['list'] !== 'sales' || ! $filters['developer_id']) {
                    return null;
                }
                $page = $this->reports->saleList($filters);

                return ['data' => $page->items(), 'total' => $page->total(), 'page' => $page->currentPage(), 'per_page' => $page->perPage()];
            },
            'breakdown' => function () use ($filters) {
                $page = $this->reports->breakdown($filters);

                return ['data' => $page->items(), 'total' => $page->total(), 'page' => $page->currentPage(), 'per_page' => $page->perPage()];
            },
            'options' => [
                'categories' => SalesReportService::CATEGORIES,
                'statuses' => SalesReportService::STATUSES,
                'views' => SalesReportService::VIEWS,
            ],
        ]);
    }

    /**
     * Report slugs offered for this reach (e.g. no Top Teams for someone locked to one team) and the reader's role.
     *
     * @param  array<string, int>|null  $lock
     * @return array<int, string>
     */
    private function available(?array $lock, User $user): array
    {
        $views = $this->reports->viewsFor($lock);
        $reports = array_keys(array_filter(self::REPORTS, fn (string $view) => in_array($view, $views, true)));
        $reports = ['recruits', 'recruits-progress', ...$reports];

        return array_values(array_filter($reports, fn (string $slug) => $user->can(self::permission($slug))));
    }

    /**
     * What the reader clicked into on Recruits Progress: a team, sub-team, area or sponsor (agent id).
     *
     * @return array<string, int|string>
     */
    private function selection(Request $request, array|null|false $lock = null): array
    {
        if ($person = $request->integer('person')) {
            return $this->personSelection($person, $lock);
        }
        $area = $request->query('area');

        return array_filter([
            'team_id' => $request->integer('team_id'),
            'sub_team_id' => $request->integer('sub_team_id'),
            'sponsor_id' => $request->integer('sponsor_id'),
            'area' => is_string($area) && array_key_exists($area, config('areas')) ? $area : null,
        ]);
    }

    /**
     * The selection narrowed by the reader's reach: their own team / sub-team always wins, so a leader can only
     * click deeper into it.
     *
     * @param  array<string, int>  $selection
     * @param  array<string, int>|null  $lock
     * @return array<string, int>|null
     */
    /**
     * A clicked person, as what their recruits are: a team leader's team, a unit manager's sub-team, anyone else the
     * agents they sponsored. An agent reading their own recruits goes person by person down their downline (sponsor only).
     *
     * @return array<string, int>
     */
    private function personSelection(int $person, array|null|false $lock): array
    {
        $sponsor = ['sponsor_id' => $person];
        if (isset($lock['agent_id'])) {
            return $sponsor;
        }
        // A leader reads only inside their own group: someone leading another one shows just the agents they sponsored there.
        $lockTeam = is_array($lock) ? ($lock['team_id'] ?? null) : null;
        $lockSubTeam = is_array($lock) ? ($lock['sub_team_id'] ?? null) : null;

        if ($team = (int) DB::table('teams')->where('agent_id', $person)->where('status', 'active')->value('id')) {
            return ! $lockSubTeam && (! $lockTeam || $lockTeam === $team) ? ['team_id' => $team] : $sponsor;
        }
        $subTeam = DB::table('sub_teams')->where('agent_id', $person)->where('status', 'active')->first(['id', 'team_id']);
        if ($subTeam) {
            $inside = (! $lockTeam || $lockTeam === (int) $subTeam->team_id) && (! $lockSubTeam || $lockSubTeam === (int) $subTeam->id);

            return $inside ? ['sub_team_id' => (int) $subTeam->id] : $sponsor;
        }

        return $sponsor;
    }

    // Recruits reach: the reader's team / sub-team, an office secretary's area, or for an agent the recruits they
    // sponsored (referral_id).
    private function recruitLock(?array $lock): ?array
    {
        return isset($lock['agent_id']) ? ['sponsor_id' => $lock['agent_id']] : $lock;
    }

    private function narrow(array $selection, ?array $lock, ?User $reader = null): ?array
    {
        // An agent's lock is their own recruits; a sponsor further down their downline replaces it (agent › agent › …).
        if (isset($lock['sponsor_id'], $selection['sponsor_id']) && $reader && $selection['sponsor_id'] !== $lock['sponsor_id']
            && app(GenealogyService::class)->canView($reader, $selection['sponsor_id'])) {
            unset($lock['sponsor_id']);
        }
        $scope = array_merge($selection, $lock ?? []);

        return $scope ?: null;
    }
}
