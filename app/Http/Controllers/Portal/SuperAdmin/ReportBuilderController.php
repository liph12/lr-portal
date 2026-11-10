<?php

namespace App\Http\Controllers\Portal\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\SuperAdmin\AskReportBuilderRequest;
use App\Services\ActivityLogger;
use App\Services\RecruitProgressService;
use App\Services\ReportBuilderAiService;
use App\Services\SalesReportService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

// Report Builder (superadmin only): the same dynamic, filterable breakdown engines behind Dashboard › View Sales
// (SalesReportService, every view, unrestricted — a superadmin's reach is the whole system) and Reports › Recruits
// Progress (RecruitProgressService, every grouping but the recruit-by-recruit one), with a CSV export neither page
// offers — "build your own report" instead of a fixed table or link.
class ReportBuilderController extends Controller
{
    // A sensible ceiling for a spreadsheet, not a hard system limit.
    private const EXPORT_ROWS = 5000;

    public function __construct(private SalesReportService $sales, private RecruitProgressService $recruitProgress, private ReportBuilderAiService $ai) {}

    public function sales(Request $request)
    {
        // Unrestricted (a superadmin's reach is the whole system), so its own Top teams / Top sub-teams / Projects
        // cards are always offered inside a developer or a branch, same as the back office on View Sales.
        $filters = $this->sales->remapList($this->sales->filters($request->query()), true);

        return inertia('Portal/SuperAdmin/ReportBuilder/Sales', [
            'filters' => $filters,
            'groupTabs' => true,
            'scope' => fn () => $this->sales->scopeTrail($filters),
            'summary' => fn () => $this->sales->summary($filters),
            'breakdown' => function () use ($filters) {
                $page = $this->sales->breakdown($filters);

                return ['data' => $page->items(), 'total' => $page->total(), 'page' => $page->currentPage(), 'per_page' => $page->perPage()];
            },
            'options' => ['categories' => SalesReportService::CATEGORIES, 'statuses' => SalesReportService::STATUSES, 'views' => SalesReportService::VIEWS],
            'aiEnabled' => fn () => $this->ai->configured(),
        ]);
    }

    // Ask AI: a free-text request becomes a filter set (ReportBuilderAiService), applied by redirecting into the
    // same Sales report — never a bespoke result page.
    public function ask(AskReportBuilderRequest $request, ActivityLogger $log)
    {
        $prompt = $request->validated('prompt');
        $result = $this->ai->interpret($prompt, $request->user());

        if ($result['error']) {
            return back(303)->with('error', $result['error']);
        }

        $log->describe('report_builder.ai_query', "Asked the AI report builder: \"{$prompt}\"", null, [
            'understood' => $result['summary'], 'filters' => $result['filters'], 'warnings' => $result['warnings'],
        ]);

        $message = $result['warnings'] ? $result['summary'].' (But I '.implode(' and ', $result['warnings']).'.)' : $result['summary'];

        return redirect()->route('superadmin.report-builder.sales', $result['filters'])
            ->with($result['warnings'] ? 'warning' : 'success', $message);
    }

    public function exportSales(Request $request)
    {
        $filters = ['per_page' => self::EXPORT_ROWS, 'page' => 1] + $this->sales->remapList($this->sales->filters($request->query()), true);
        $rows = $this->sales->breakdown($filters)->items();

        return $this->csv("sales-report-{$filters['view']}", $rows, ['id' => 'ID', 'name' => 'Name', 'detail' => 'Detail', 'area' => 'Branch', 'team' => 'Team', 'sales' => 'Total units', 'value' => 'Value']);
    }

    public function recruits(Request $request)
    {
        // Ranked groupings only — "recruits" lists people one by one, a different shape, left out of the builder.
        $groups = $this->groups();
        $filters = $this->recruitProgress->filters($request->query(), $groups);

        return inertia('Portal/SuperAdmin/ReportBuilder/Recruits', [
            'filters' => $filters,
            'table' => function () use ($filters) {
                $page = $this->recruitProgress->table($filters, null);

                return ['data' => $page->items(), 'total' => $page->total(), 'page' => $page->currentPage(), 'per_page' => $page->perPage()];
            },
            'options' => ['groups' => $groups],
        ]);
    }

    public function exportRecruits(Request $request)
    {
        $groups = $this->groups();
        $filters = ['per_page' => self::EXPORT_ROWS, 'page' => 1] + $this->recruitProgress->filters($request->query(), $groups);
        $rows = $this->recruitProgress->table($filters, null)->items();

        return $this->csv("recruits-report-{$filters['group']}", $rows, [
            'id' => 'ID', 'name' => 'Name', 'detail' => 'Detail', 'team' => 'Team', 'recruits' => 'Recruits', 'sold' => 'Sold',
            'conversion' => 'Conversion %', 'value' => 'Sales value', 'trainees' => 'Trainees', 'nao' => 'NAO %', 'fire' => 'FIRE %',
            'total_sales' => 'Group total sales',
        ]);
    }

    /**
     * @return array<int, string>
     */
    private function groups(): array
    {
        return array_values(array_diff($this->recruitProgress->groupsFor(null), ['recruits']));
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<string, string>  $columns  row key => CSV header
     */
    private function csv(string $filename, array $rows, array $columns): StreamedResponse
    {
        return response()->streamDownload(function () use ($rows, $columns) {
            $out = fopen('php://output', 'w');
            fputcsv($out, array_values($columns));
            foreach ($rows as $row) {
                fputcsv($out, array_map(fn ($key) => is_array($row[$key] ?? null) ? '' : ($row[$key] ?? ''), array_keys($columns)));
            }
            fclose($out);
        }, $filename.'-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv']);
    }
}
