<?php

namespace App\Http\Controllers\Portal\Sales;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\Sales\SaleRequest;
use App\Http\Requests\Portal\Sales\StoreBrokerageSaleRequest;
use App\Http\Requests\Portal\Sales\StoreInternationalSaleRequest;
use App\Http\Requests\Portal\Sales\StoreProjectSaleRequest;
use App\Http\Requests\Portal\Sales\StoreRentalSaleRequest;
use App\Models\Entities\BrokerageArea;
use App\Models\Entities\Developer;
use App\Models\Entities\DeveloperProject;
use App\Models\Entities\ProjectPropertyType;
use App\Services\BrokerageSaleService;
use App\Services\InternationalSaleService;
use App\Services\ProjectSaleService;
use App\Services\RentalSaleService;
use App\Services\SalesEncodingService;
use Illuminate\Http\UploadedFile;

// Recording sales from the shared dashboard; open to roles with `record_sales` (AgentTransactionPolicy::create).
class SaleController extends Controller
{
    public function __construct(
        private ProjectSaleService $projectSaleService,
        private RentalSaleService $rentalSaleService,
        private BrokerageSaleService $brokerageSaleService,
        private SalesEncodingService $encoding,
        private InternationalSaleService $internationalSaleService,
    ) {}

    public function recordProject()
    {
        $developers = Developer::query()->orderBy('name')->get(['id', 'name']);

        // ~2k rows of id/name pairs is small enough to send once and filter by developer in the browser.
        $projects = DeveloperProject::query()
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'developer_id', 'name', 'project_property_type_id']);

        $propertyTypes = ProjectPropertyType::query()->orderBy('name')->get(['id', 'name']);

        return inertia('Portal/Dashboard/RecordSale/Project', [
            ...$this->encodingProps(),
            'developers' => $developers,
            'projects' => $projects,
            'propertyTypes' => $propertyTypes,
            'maxFileKb' => $this->maxFileKb(),
        ]);
    }

    public function storeProject(StoreProjectSaleRequest $request)
    {
        $this->projectSaleService->record(
            $request->safe()->except('proof_of_transaction'),
            $request->file('proof_of_transaction'),
            $request->user(),
        );

        return redirect()
            ->route('dashboard.record-sale')
            ->with('success', 'Project sale recorded. Your proof of transaction was uploaded.');
    }

    public function recordRental()
    {
        return inertia('Portal/Dashboard/RecordSale/Rental', [
            ...$this->encodingProps(),
            'propertyTypes' => ProjectPropertyType::query()->orderBy('name')->get(['id', 'name']),
            'maxFileKb' => $this->maxFileKb(),
        ]);
    }

    public function storeRental(StoreRentalSaleRequest $request)
    {
        $this->rentalSaleService->record(
            $request->safe()->except(['remittance_slip', 'deposit_slip']),
            $request->file('remittance_slip'),
            $request->file('deposit_slip'),
            $request->user(),
        );

        return redirect()
            ->route('dashboard.record-sale')
            ->with('success', 'Rental sale recorded. Your slips were uploaded.');
    }

    public function recordBrokerage()
    {
        return inertia('Portal/Dashboard/RecordSale/Brokerage', [
            ...$this->encodingProps(),
            'brokerageAreas' => BrokerageArea::query()->where('status', 'active')->orderBy('name')->get(['id', 'name']),
            'propertyTypes' => ProjectPropertyType::query()->orderBy('name')->get(['id', 'name']),
            'maxFileKb' => $this->maxFileKb(),
        ]);
    }

    public function storeBrokerage(StoreBrokerageSaleRequest $request)
    {
        $this->brokerageSaleService->record(
            $request->safe()->except(['remittance_slip', 'deposit_slip']),
            $request->file('remittance_slip'),
            $request->file('deposit_slip'),
            $request->user(),
        );

        return redirect()
            ->route('dashboard.record-sale')
            ->with('success', 'Brokerage sale recorded. Your slips were uploaded.');
    }

    // PHP can be configured below the app's 20MB rule; tell the UI the real ceiling so it fails early.
    private function maxFileKb(): int
    {
        return min(SaleRequest::MAX_FILE_KB, intdiv(UploadedFile::getMaxFilesize(), 1024));
    }

    public function recordInternational()
    {
        return inertia('Portal/Dashboard/RecordSale/International', [
            ...$this->encodingProps(),
            'propertyTypes' => ProjectPropertyType::query()->orderBy('name')->get(['id', 'name']),
            'maxFileKb' => $this->maxFileKb(),
        ]);
    }

    public function storeInternational(StoreInternationalSaleRequest $request)
    {
        $this->internationalSaleService->record(
            $request->safe()->except('proof_of_transaction'),
            $request->file('proof_of_transaction'),
            $request->user(),
        );

        return redirect()
            ->route('dashboard.record-sale')
            ->with('success', 'International sale recorded. Your proof of transaction was uploaded.');
    }

    /**
     * Whether recording is on, and when each month closes, so the form can warn before submitting.
     *
     * @return array<string, mixed>
     */
    private function encodingProps(): array
    {
        return ['encoding' => $this->encoding->state(), 'cutoffs' => $this->encoding->cutoffTimes()];
    }
}
