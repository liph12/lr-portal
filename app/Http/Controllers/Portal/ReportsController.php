<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Services\SalesReportService;
use Illuminate\Http\Request;

// Reports: a card per report, each opening its own page (date range, statistics, ranked table).
// Same data as Dashboard › View Sales, one report at a time. Needs `view_reports`.
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
    ];

    public function __construct(private SalesReportService $reports) {}

    public function index()
    {
        return inertia('Portal/Reports/Index');
    }

    public function show(Request $request, string $report)
    {
        abort_unless(isset(self::REPORTS[$report]), 404);

        $filters = $this->reports->filters(['view' => self::REPORTS[$report]] + $request->query());

        return inertia('Portal/Reports/Show', [
            'report' => $report,
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
                'views' => SalesReportService::VIEWS,
            ],
        ]);
    }
}
