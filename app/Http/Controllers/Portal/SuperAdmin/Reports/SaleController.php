<?php

namespace App\Http\Controllers\Portal\SuperAdmin\Reports;

use App\Http\Controllers\Controller;
use App\Http\Requests\SuperAdmin\StoreProjectSaleRequest;
use App\Models\Entities\Developer;
use App\Models\Entities\DeveloperProject;
use App\Models\Entities\ProjectPropertyType;
use App\Services\ProjectSaleService;
use Illuminate\Http\UploadedFile;

class SaleController extends Controller
{
    public function __construct(private ProjectSaleService $projectSaleService) {}

    public function recordProject()
    {
        $developers = Developer::query()->orderBy('name')->get(['id', 'name']);

        // PHP can be configured below the app's 20MB rule; tell the UI the real ceiling so it fails early.
        $maxFileKb = min(StoreProjectSaleRequest::MAX_FILE_KB, intdiv(UploadedFile::getMaxFilesize(), 1024));

        // ~2k rows of id/name pairs is small enough to send once and filter by developer in the browser.
        $projects = DeveloperProject::query()
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'developer_id', 'name', 'project_property_type_id']);

        $propertyTypes = ProjectPropertyType::query()->orderBy('name')->get(['id', 'name']);

        return inertia('SuperAdmin/Dashboard/RecordSale/Project', [
            'developers' => $developers,
            'projects' => $projects,
            'propertyTypes' => $propertyTypes,
            'maxFileKb' => $maxFileKb,
        ]);
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
