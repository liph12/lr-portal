<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Services\SaleValidationService;
use App\Services\SalesReportService;
use App\Services\TeamLeadershipService;
use Illuminate\Http\Request;

// Dashboard › View Sales: totals, trend and a ranked breakdown. Back office sees everything; leaders their own
// team or sub-team; other report readers their own sales (TeamLeadershipService::reportScope).
class SalesReportController extends Controller
{
    public function __construct(
        private SalesReportService $reports,
        private TeamLeadershipService $leadership,
    ) {}

    public function index(Request $request)
    {
        $lock = $this->leadership->reportScope($request->user());
        abort_if($lock === false, 403);
        $views = $this->reports->viewsFor($lock);
        $input = in_array($request->query('view'), $views, true) ? $request->query() : ['view' => 'agents'] + $request->query();
        $filters = $this->reports->lockedFilters($input, $lock);

        return inertia('Portal/Dashboard/Reports/Index', [
            'filters' => $filters,
            'scopeLocked' => $lock !== null,
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
                'views' => $this->reports->viewsFor($lock),
            ],
        ]);
    }
}
