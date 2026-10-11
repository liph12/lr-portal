<?php

namespace App\Services;

use App\Models\Entities\Agent;
use App\Models\Entities\AgentTransaction;
use App\Models\Entities\ProjectPropertyType;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Throwable;

class RentalSaleService
{
    public function __construct(
        private SaleFileStorage $files,
        private ActivityLogger $activity,
    ) {}

    /**
     * @param  array<string, mixed>  $data  validated StoreRentalSaleRequest input
     */
    public function record(array $data, UploadedFile $remittanceSlip, ?UploadedFile $depositSlip, User $recorder): AgentTransaction
    {
        try {
            $transaction = DB::transaction(function () use ($data, $remittanceSlip, $depositSlip, $recorder) {
                $transaction = SaleRecord::create(AgentTransaction::TYPE_RENTAL, $data, $recorder);
                $typeId = (int) $data['project_property_type_id'];
                $folder = "sales/rental/{$transaction->id}";

                $transaction->rentalTransaction()->create([
                    'project_property_type_id' => $typeId,
                    ...ProjectPropertyType::measurements($typeId, $data),
                    'reservation_date' => $data['reservation_date'],
                    'rental_rate' => $data['rental_rate'],
                    'total_contract_price' => $data['total_contract_price'],
                    'commission_received' => 0,
                    // Stored by name, the same way legacy rentals record them.
                    'closing_agent' => $this->agentName($data['closing_agent_id'] ?? null),
                    'partner_agent' => $this->agentName($data['partner_agent_id'] ?? null),
                    'remittance_slip' => $this->files->store($remittanceSlip, $folder),
                    'deposit_slip' => $depositSlip ? $this->files->store($depositSlip, $folder) : null,
                ]);

                return $transaction;
            });
        } catch (Throwable $e) {
            $this->files->discardUploaded();

            throw $e;
        }

        $rental = $transaction->rentalTransaction;

        $this->activity->describe(
            'sale.rental.recorded',
            "Recorded rental sale #{$transaction->id}: unit {$transaction->unit_number}",
            $transaction,
            [
                'remittance_slip' => $rental->remittance_slip,
                'deposit_slip' => $rental->deposit_slip,
                'closing_agent' => $rental->closing_agent,
                'partner_agent' => $rental->partner_agent,
                ...$this->files->totals(),
            ],
        );

        return $transaction;
    }

    private function agentName(?int $agentId): ?string
    {
        if (! $agentId) {
            return null;
        }

        $agent = Agent::with('user:id,name')->find($agentId, ['id', 'user_id', 'first_name', 'last_name']);
        $name = trim("{$agent?->first_name} {$agent?->last_name}");

        return $name !== '' ? $name : $agent?->user?->name;
    }
}
