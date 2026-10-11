<?php

namespace App\Http\Controllers\Portal\SuperAdmin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\SuperAdmin\Settings\DeleteSalesCutoffRequest;
use App\Http\Requests\SuperAdmin\Settings\SaveSalesCutoffRequest;
use App\Http\Requests\SuperAdmin\Settings\UpdateSalesEncodingRequest;
use App\Models\Entities\SalesCutoff;
use App\Services\SalesEncodingService;

class SalesCutoffController extends Controller
{
    public function __construct(private SalesEncodingService $encoding) {}

    public function index()
    {
        return inertia('SuperAdmin/Settings/SalesCutoffs/Index', [
            'cutoffs' => SalesCutoff::orderByDesc('month')->get(['id', 'month', 'cutoff_at'])
                ->map(fn (SalesCutoff $c) => [
                    'id' => $c->id,
                    'month' => $c->month,
                    'cutoff_at' => $c->cutoff_at->format('Y-m-d\TH:i'),
                    'closed' => $c->cutoff_at->isPast(),
                ]),
            'encoding' => $this->encoding->state(),
        ]);
    }

    public function store(SaveSalesCutoffRequest $request)
    {
        $cutoff = $this->encoding->saveCutoff(null, $request->validated('month'), $request->validated('cutoff_at'));

        return back()->with('success', "Cutoff for {$this->encoding->monthLabel($cutoff->month)} saved.");
    }

    public function update(SaveSalesCutoffRequest $request, SalesCutoff $salesCutoff)
    {
        $this->encoding->saveCutoff($salesCutoff, $request->validated('month'), $request->validated('cutoff_at'));

        return back()->with('success', "Cutoff for {$this->encoding->monthLabel($salesCutoff->month)} saved.");
    }

    public function destroy(DeleteSalesCutoffRequest $request, SalesCutoff $salesCutoff)
    {
        $this->encoding->deleteCutoff($salesCutoff);

        return back()->with('success', "Cutoff for {$this->encoding->monthLabel($salesCutoff->month)} removed.");
    }

    public function encoding(UpdateSalesEncodingRequest $request)
    {
        $enabled = $request->boolean('enabled');
        $this->encoding->setEnabled($enabled, $request->validated('message'), $request->user());

        return back()->with('success', $enabled ? 'Sale recording is on again.' : 'Sale recording is now off for everyone.');
    }
}
