<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Services\NatconService;
use App\Services\SaleValidationService;
use App\Services\SalesReportService;
use Illuminate\Http\Request;

// NATCON: the national rankings, one edition at a time (NATCON 2026, 2027… — Settings › NATCON): /natcon and /natcon/{board}
// show the default edition, /natcon/{year}/… any other. One card per board, like Reports. The back office sees every board;
// team leaders / unit managers who qualified on the group they lead (NatconService::reach).
class NatconController extends Controller
{
    public function __construct(private NatconService $natcon, private SalesReportService $reports) {}

    public function index(Request $request, ?int $year = null)
    {
        $reach = $this->reach($request);
        $edition = $this->edition($year);

        return inertia('Portal/Natcon/Index', [
            ...$this->editionProps($edition),
            'period' => $this->natcon->period('qualifiers', $edition),
            'boards' => $this->boards($reach['boards'], $edition),
            'counts' => $this->natcon->counts($reach['boards'], $edition, $reach['lock']),
            'group' => $reach['group'] ? ['name' => $reach['group'], 'type' => $reach['group_type']] : null,
            // Anyone with an agent record also has their own NATCON sales.
            'hasMine' => $request->user()->agent()->exists(),
        ]);
    }

    // My NATCON Sales: the reader's own sales that count for NATCON, shown like My Sales (period, status and cutoff fixed).
    public function mine(Request $request, ?int $year = null)
    {
        $this->reach($request);
        $edition = $this->edition($year);
        $agentId = (int) $request->user()->agent()->value('id');
        abort_unless($agentId, 403);

        $filters = $this->natcon->mineFilters($agentId, $request->query(), $edition);

        return inertia('Portal/Natcon/MySales', [
            ...$this->editionProps($edition),
            'period' => $this->natcon->period('qualifiers', $edition),
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

    // The default edition's board (/natcon/{board}).
    public function showDefault(Request $request, string $board)
    {
        return $this->show($request, null, $board);
    }

    public function show(Request $request, ?int $year, string $board)
    {
        abort_unless(array_key_exists($board, NatconService::BOARDS), 404);
        $reach = $this->reach($request);
        abort_unless(in_array($board, $reach['boards'], true), 403);
        $edition = $this->edition($year);

        $filters = $request->only(['q', 'page', 'per_page']);
        $page = $this->natcon->board($board, $edition, $filters, $reach['lock']);

        return inertia('Portal/Natcon/Show', [
            ...$this->editionProps($edition),
            'period' => $this->natcon->period($board, $edition),
            'board' => collect($this->boards($reach['boards'], $edition))->firstWhere('slug', $board),
            'group' => $reach['group'] ? ['name' => $reach['group'], 'type' => $reach['group_type']] : null,
            'filters' => $filters,
            'rows' => ['data' => $page->items(), 'total' => $page->total(), 'page' => $page->currentPage(), 'per_page' => $page->perPage()],
            // Rows open the agent's sales / the group's report: the back office with reports, leaders their own members.
            'canOpen' => $reach['group'] !== null || $request->user()->can('view_reports'),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function edition(?int $year): array
    {
        $edition = $this->natcon->edition($year);
        abort_unless($edition !== null, 404, $year ? "There's no NATCON {$year}." : 'No NATCON has been set up yet.');

        return $edition;
    }

    // The edition shown (its settings: qualifier amount…), every edition for the switcher, and where its pages live.
    private function editionProps(array $edition): array
    {
        return ['settings' => $edition, 'edition' => $edition, 'editions' => $this->natcon->editions(), 'base' => "/natcon/{$edition['year']}"];
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
    private function boards(array $allowed, array $edition): array
    {
        return collect(NatconService::BOARDS)
            ->only($allowed)
            ->map(fn ($b, $slug) => [
                'slug' => $slug, 'title' => $b['title'], 'description' => $b['description'], 'group' => $b['group'], 'category' => $b['category'] ?? null,
                'period' => $this->natcon->period($slug, $edition),
            ])
            ->values()->all();
    }
}
