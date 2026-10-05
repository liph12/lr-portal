<?php

namespace App\Http\Controllers\Portal\SuperAdmin\Reports;

use App\Http\Controllers\Controller;
use App\Http\Requests\SuperAdmin\StoreProjectSaleRequest;
use App\Models\Entities\Developer;
use App\Services\ProjectSaleService;

class SaleController extends Controller
{
    public function __construct(private ProjectSaleService $projectSaleService) {}

    public function recordProject()
    {
        $developers = Developer::query()->orderBy('name')->get(['id', 'name']);

        return inertia('SuperAdmin/Dashboard/RecordSale/Project', ['developers' => $developers]);
    }

    public function storeProject(StoreProjectSaleRequest $request)
    {
        $this->projectSaleService->record(
            $request->safe()->except('files'),
            $request->file('files', []),
            $request->user(),
        );

        return redirect()
            ->route('superadmin.record-sale')
            ->with('success', 'Project sale recorded. Your proof of transaction was uploaded.');
    }

    public function recordRental()
    {
        return inertia('SuperAdmin/Dashboard/RecordSale/Rental');
    }

    public function recordBrokerage()
    {
        return inertia('SuperAdmin/Dashboard/RecordSale/Brokerage');
    }
}
