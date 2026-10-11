<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Services\SalesReportService;
use Illuminate\Http\Request;

// Dashboard › View Sales: totals, trend and a ranked breakdown, for roles with `view_reports`.
class SalesReportController extends Controller
{
    public function __construct(private SalesReportService $reports) {}

    public function index(Request $request)
    {
        $filters = $this->reports->filters($request->query());

        return inertia('Portal/Dashboard/Reports/Index', [
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
