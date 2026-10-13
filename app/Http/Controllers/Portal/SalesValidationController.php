<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\Sales\UpdateValidatedSaleRequest;
use App\Http\Requests\Portal\Sales\ValidateSaleRequest;
use App\Models\Entities\AgentTransaction;
use App\Services\SaleValidationService;
use App\Support\Areas;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;

// Sales validation (sales_validation): area → category → sales by status. The back office (its portals) sees every area;
// an office secretary (shared /sales-validation) only their office's area(s).
class SalesValidationController extends Controller
{
    public function __construct(private SaleValidationService $validation) {}

    public function index(Request $request)
    {
        $allowed = $this->validation->allowedAreas($request->user());
        abort_if($allowed === false, 403, 'Only the secretary of an office validates its sales.');

        $f = $this->validation->filters($request->query(), $allowed);
        // A secretary of one office has nothing to pick: open their area.
        if (! $f['area'] && $allowed && count($allowed) === 1) {
            $f['area'] = $allowed[0];
        }

        return inertia('Portal/SalesValidation/Index', [
            // The allowed areas stay server-side (they'd otherwise end up in the URL).
            'filters' => Arr::except($f, 'allowed'),
            'singleArea' => $allowed && count($allowed) === 1,
            'statuses' => SaleValidationService::STATUSES,
            'categories' => SaleValidationService::CATEGORIES,
            'areaName' => $f['area'] ? ($f['area'] === SaleValidationService::ALL_AREAS ? ($allowed ? 'All my branches' : 'All branches') : Areas::name($f['area'])) : null,
            // Each step only loads what it shows.
            'areas' => fn () => $f['area'] ? null : $this->validation->areas($f),
            'counts' => fn () => $f['area'] ? $this->validation->categoryCounts($f) : null,
            // Pickers for the edit dialog, once the table step is open.
            'editOptions' => fn () => $f['category'] ? $this->validation->editOptions() : null,
            // The sale panel / expanded sale, for ?sale=ID.
            'saleDetail' => fn () => ($sale = (int) $request->query('sale')) ? $this->validation->detail($sale, $allowed) : null,
            // The agent side panel, for ?agent=ID (kept out of the table filters so paging doesn't close it).
            'agentSales' => fn () => ($agent = (int) $request->query('agent'))
                ? $this->validation->agentSales($agent, $f, $request->query('agent_dates') === 'all')
                : null,
            'sales' => function () use ($f) {
                if (! $f['area'] || ! $f['category']) {
                    return null;
                }
                $page = $this->validation->table($f);

                return ['data' => $page->items(), 'total' => $page->total(), 'page' => $page->currentPage(), 'per_page' => $page->perPage()];
            },
        ]);
    }

    public function edit(UpdateValidatedSaleRequest $request, AgentTransaction $sale)
    {
        $this->validation->update($sale, $request->validated(), $request->user());

        return back()->with('success', 'Sale saved.');
    }

    public function update(ValidateSaleRequest $request, AgentTransaction $sale)
    {
        $this->validation->setStatus($sale, $request->validated('status'), $request->user());

        return back()->with('success', "Sale #{$sale->id} marked {$request->validated('status')}.");
    }
}
