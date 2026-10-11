<?php

namespace App\Services;

use App\Models\Entities\AgentTransaction;
use App\Models\Entities\ProjectPropertyType;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Throwable;

class BrokerageSaleService
{
    public function __construct(
        private SaleFileStorage $files,
        private ActivityLogger $activity,
    ) {}

    /**
     * @param  array<string, mixed>  $data  validated StoreBrokerageSaleRequest input
     */
    public function record(array $data, UploadedFile $remittanceSlip, ?UploadedFile $depositSlip, User $recorder): AgentTransaction
    {
        try {
            $transaction = DB::transaction(function () use ($data, $remittanceSlip, $depositSlip, $recorder) {
                $transaction = SaleRecord::create(AgentTransaction::TYPE_BROKERAGE, $data, $recorder);
                $typeId = (int) $data['project_property_type_id'];
                $folder = "sales/brokerage/{$transaction->id}";

                $transaction->brokerageTransaction()->create([
                    'brokerage_area_id' => $data['brokerage_area_id'],
                    'project_property_type_id' => $typeId,
                    ...ProjectPropertyType::measurements($typeId, $data),
                    'reservation_date' => $data['reservation_date'],
                    'total_contract_price' => $data['total_contract_price'],
                    'commission_received' => 0,
                    'remittance_slip' => $this->files->store($remittanceSlip, $folder),
                    'deposit_slip' => $depositSlip ? $this->files->store($depositSlip, $folder) : null,
                ]);

                return $transaction;
            });
        } catch (Throwable $e) {
            $this->files->discardUploaded();

            throw $e;
        }

        $brokerage = $transaction->brokerageTransaction()->with('brokerageArea:id,name')->first();

        $this->activity->describe(
            'sale.brokerage.recorded',
            "Recorded brokerage sale #{$transaction->id}: {$brokerage->brokerageArea?->name}, unit {$transaction->unit_number}",
            $transaction,
            [
                'remittance_slip' => $brokerage->remittance_slip,
                'deposit_slip' => $brokerage->deposit_slip,
                ...$this->files->totals(),
            ],
        );

        return $transaction;
    }
}
