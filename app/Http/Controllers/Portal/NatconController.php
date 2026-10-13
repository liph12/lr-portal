<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Services\NatconService;
use App\Services\SaleValidationService;
use App\Services\SalesReportService;
use Illuminate\Http\Request;

// NATCON: the national rankings for the convention period (Settings › NATCON) — one card per board, like Reports. The back
// office sees every board; team leaders / unit managers who qualified on the group they lead (NatconService::reach).
class NatconController extends Controller
{
    public function __construct(private NatconService $natcon, private SalesReportService $reports) {}

    public function index(Request $request)
    {
        $reach = $this->reach($request);

        return inertia('Portal/Natcon/Index', [
            'settings' => $this->natcon->settings(),
            'period' => $this->natcon->period('qualifiers'),
            'boards' => $this->boards($reach['boards']),
            'counts' => $this->natcon->counts($reach['boards'], $reach['lock']),
            'group' => $reach['group'] ? ['name' => $reach['group'], 'type' => $reach['group_type']] : null,
            // Anyone with an agent record also has their own NATCON sales.
            'hasMine' => $request->user()->agent()->exists(),
        ]);
    }

    // My NATCON Sales: the reader's own sales that count for NATCON, shown like My Sales (period, status and cutoff fixed).
    public function mine(Request $request)
    {
        $this->reach($request);
        $agentId = (int) $request->user()->agent()->value('id');
        abort_unless($agentId, 403);

        $filters = $this->natcon->mineFilters($agentId, $request->query());

        return inertia('Portal/Natcon/MySales', [
            'settings' => $this->natcon->settings(),
            'period' => $this->natcon->period('qualifiers'),
            // The URL-facing filters: the cutoff stays server-side.
            'filters' => array_diff_key($filters, ['encoded_by' => true]),
            'summary' => fn () => $this->reports->summary($filters),
            'totals' => fn () => $this->reports->categoryTotals($filters),
            'saleList' => function () use ($filters) {
                $page = $this->reports->saleList($filters);

                return ['data' => $page->items(), 'total' => $page->total(), 'page' => $page->currentPage(), 'per_page' => $page->perPage()];
            },
            'saleDetail' => fn () => ($sale = (int) $request->query('sale')) && $this->reports->containsSale($filters, $sale)
                ? app(SaleValidationService::class)->detail($sale)
                : null,
            'options' => ['categories' => SalesReportService::CATEGORIES, 'statuses' => SalesReportService::STATUSES],
        ]);
    }

    public function show(Request $request, string $board)
    {
        abort_unless(array_key_exists($board, NatconService::BOARDS), 404);
        $reach = $this->reach($request);
        abort_unless(in_array($board, $reach['boards'], true), 403);

        $filters = $request->only(['q', 'page', 'per_page']);
        $page = $this->natcon->board($board, $filters, $reach['lock']);

        return inertia('Portal/Natcon/Show', [
            'settings' => $this->natcon->settings(),
            'period' => $this->natcon->period($board),
            'board' => collect($this->boards($reach['boards']))->firstWhere('slug', $board),
            'group' => $reach['group'] ? ['name' => $reach['group'], 'type' => $reach['group_type']] : null,
            'filters' => $filters,
            'rows' => ['data' => $page->items(), 'total' => $page->total(), 'page' => $page->currentPage(), 'per_page' => $page->perPage()],
            // Rows open the agent's sales / the group's report: the back office with reports, leaders their own members.
            'canOpen' => $reach['group'] !== null || $request->user()->can('view_reports'),
        ]);
    }

    /**
     * @return array{boards: list<string>, lock: array<string, int>, group: ?string, group_type: ?string}
     */
    private function reach(Request $request): array
    {
        $reach = $this->natcon->reach($request->user());
        abort_if($reach === false, 403, 'NATCON is open to the back office, team leaders, unit managers and agents.');

        return $reach;
    }

    /**
     * @param  list<string>  $allowed
     * @return list<array{slug: string, title: string, description: string, group: string, category: ?string, period: array<string, ?string>}>
     */
    private function boards(array $allowed): array
    {
        $settings = $this->natcon->settings();

        return collect(NatconService::BOARDS)
            ->only($allowed)
            ->map(fn ($b, $slug) => [
                'slug' => $slug, 'title' => $b['title'], 'description' => $b['description'], 'group' => $b['group'], 'category' => $b['category'] ?? null,
                'period' => $this->natcon->period($slug, $settings),
            ])
            ->values()->all();
    }
}
