<?php

namespace App\Services;

use App\Models\Entities\AgentTransaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Throwable;

// What happens to a brokerage or rental commission slip at Brokerage / Rental receiving: received (signed, on a date that
// can be corrected later), or disapproved with a reason. Each validates or invalidates the sale and stamps the slip.
class CommissionReceiptService
{
    public function __construct(
        private SaleFileStorage $files,
        private CommissionSlipImage $slips,
        private SaleValidationService $validation,
        private ActivityLogger $activity,
    ) {}

    public function receive(AgentTransaction $sale, User $by, string $signaturePng, Carbon $on): void
    {
        $details = $this->details($sale);
        if ($details->received_at) {
            return;
        }
        // The day chosen, at the time it was recorded.
        $at = $on->copy()->setTimeFrom(now());

        try {
            $signature = $this->files->storeGenerated($signaturePng, $this->folder($sale), 'png', 'image/png', "received-signature-{$sale->id}.png");
            $this->restamp($details, fn ($png) => $this->slips->stampReceived($png, $by->name, $at->format('M j, Y'), $signaturePng));
        } catch (Throwable $e) {
            $this->files->discardUploaded();

            throw $e;
        }

        $details->forceFill(['received_by' => $by->id, 'received_at' => $at, 'received_signature' => $signature])->save();
        $this->validation->setStatus($sale, 'valid', $by);

        $this->activity->describe("sale.{$sale->sale_type}.received", "Received and signed for {$sale->sale_type} sale #{$sale->id} on {$at->toDateString()} (validated)", $sale, ['signature' => $signature]);
    }

    // A corrected receipt date: the slip is signed again with the same signature and the new date.
    public function changeReceivedDate(AgentTransaction $sale, User $by, Carbon $on): void
    {
        $details = $this->details($sale);
        $from = $details->received_at;
        $at = $on->copy()->setTimeFrom($from);
        $receiver = User::find($details->received_by);
        $signature = $details->received_signature ? $this->files->read($details->received_signature) : null;

        $this->restamp($details, fn ($png) => $this->slips->stampReceived($png, $receiver?->name ?? $by->name, $at->format('M j, Y'), $signature));
        $details->forceFill(['received_at' => $at])->save();

        $this->activity->describe("sale.{$sale->sale_type}.received_date", "Changed the received date of {$sale->sale_type} sale #{$sale->id} from {$from?->toDateString()} to {$at->toDateString()}", $sale, ['from' => $from?->toDateString(), 'to' => $at->toDateString()]);
    }

    public function disapprove(AgentTransaction $sale, User $by, string $reason): void
    {
        $details = $this->details($sale);
        $now = now();

        $this->restamp($details, fn ($png) => $this->slips->stampDisapproved($png, $by->name, $now->format('M j, Y'), $reason));
        $details->forceFill(['disapproved_by' => $by->id, 'disapproved_at' => $now, 'disapproval_reason' => $reason])->save();
        $this->validation->setStatus($sale, 'invalid', $by);

        $this->activity->describe("sale.{$sale->sale_type}.disapproved", "Disapproved {$sale->sale_type} sale #{$sale->id}: {$reason}", $sale, ['reason' => $reason]);
    }

    private function details(AgentTransaction $sale): Model
    {
        return ($sale->sale_type === AgentTransaction::TYPE_RENTAL ? $sale->rentalTransaction() : $sale->brokerageTransaction())->firstOrFail();
    }

    // Redraws the stored slip in place (same URL); a slip that's gone is left alone.
    private function restamp(Model $details, callable $draw): void
    {
        if ($details->remittance_slip && ($png = $this->files->read($details->remittance_slip))) {
            $this->files->overwrite($details->remittance_slip, $draw($png), 'image/png');
        }
    }

    private function folder(AgentTransaction $sale): string
    {
        return "sales/{$sale->sale_type}/{$sale->id}";
    }
}
