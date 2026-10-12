<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\Sales\ChangeReceivedDateRequest;
use App\Http\Requests\Portal\Sales\DisapproveCommissionRequest;
use App\Http\Requests\Portal\Sales\ReceiveCommissionRequest;
use App\Models\Entities\AgentRentalTransaction;
use App\Models\Entities\AgentTransaction;
use App\Services\CommissionReceiptService;
use App\Services\CommissionReceivingService;
use App\Services\SaleValidationService;
use App\Support\Areas;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

// Brokerage receiving and Rental receiving (one page each, the route fixes the category): commission slips waiting to be
// received, and the signed receipt (or the disapproval) that validates or invalidates each sale.
class CommissionReceivingController extends Controller
{
    public function __construct(private CommissionReceivingService $receiving, private CommissionReceiptService $receipts) {}

    public function index(Request $request, string $category, SaleValidationService $validation)
    {
        $user = $request->user();
        abort_unless(in_array($category, $this->receiving->categories($user), true), 403);

        $filters = $this->receiving->filters($request->query());
        $page = $this->receiving->list($category, $filters);

        return inertia('Portal/CommissionReceiving/Index', [
            'category' => $category,
            'sales' => ['data' => $page->items(), 'total' => $page->total(), 'page' => $page->currentPage(), 'per_page' => $page->perPage()],
            'filters' => $filters,
            'counts' => $this->receiving->counts($category, $filters),
            'areas' => collect(config('areas'))->except(Areas::ABROAD)->map(fn ($a, $key) => ['value' => $key, 'label' => $a['name']])->values(),
            // Rent.ph's share isn't stored; the page works it out from the amount received.
            'rentRates' => ['commission' => AgentRentalTransaction::COMMISSION_RATE, 'share' => AgentRentalTransaction::RENT_PH_SHARE_RATE],
            // The opened sale (?sale=ID): its slip, files and details, read-only.
            'saleDetail' => fn () => ($sale = (int) $request->query('sale')) && $this->receiving->canOpen($user, $sale, $category) ? $validation->detail($sale) : null,
        ]);
    }

    public function receive(ReceiveCommissionRequest $request, AgentTransaction $sale)
    {
        $on = Carbon::parse($request->validated('received_on'));
        $this->receipts->receive($sale, $request->user(), $request->signaturePng(), $on);

        return back()
            ->with('success', ucfirst($sale->sale_type)." sale No. {$sale->id} received — the slip is signed and the sale is valid.")
            ->with('warning', $this->beforeRemittance($sale, $on));
    }

    // Allowed, but worth a second look: a commission received before the date it was remitted.
    private function beforeRemittance(AgentTransaction $sale, Carbon $on): ?string
    {
        $remitted = ($sale->sale_type === AgentTransaction::TYPE_RENTAL ? $sale->rentalTransaction() : $sale->brokerageTransaction())->value('remittance_date');

        return $remitted && $on->toDateString() < substr((string) $remitted, 0, 10)
            ? 'The date received is before the remittance date ('.Carbon::parse($remitted)->format('M j, Y').'). Change it if that was a mistake.'
            : null;
    }

    public function receivedDate(ChangeReceivedDateRequest $request, AgentTransaction $sale)
    {
        $on = Carbon::parse($request->validated('received_on'));
        $this->receipts->changeReceivedDate($sale, $request->user(), $on);

        return back()
            ->with('success', "Received date of No. {$sale->id} changed; the slip is signed again with it.")
            ->with('warning', $this->beforeRemittance($sale, $on));
    }

    public function disapprove(DisapproveCommissionRequest $request, AgentTransaction $sale)
    {
        $this->receipts->disapprove($sale, $request->user(), $request->validated('reason'));

        return back()->with('success', ucfirst($sale->sale_type)." sale No. {$sale->id} disapproved — it's marked invalid.");
    }
}
