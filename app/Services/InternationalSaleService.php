<?php

namespace App\Services;

use App\Models\Entities\InternationalSale;
use App\Models\Entities\ProjectPropertyType;
use App\Models\User;
use App\Policies\UserPolicy;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Throwable;

class InternationalSaleService
{
    public function __construct(
        private SaleFileStorage $files,
        private ActivityLogger $activity,
        private AgentActivityService $agentActivity,
    ) {}

    /**
     * @param  array<string, mixed>  $data  validated StoreInternationalSaleRequest input
     */
    public function record(array $data, UploadedFile $proofOfTransaction, User $recorder): InternationalSale
    {
        try {
            $sale = DB::transaction(function () use ($data, $proofOfTransaction, $recorder) {
                $typeId = (int) $data['project_property_type_id'];

                $sale = InternationalSale::create([
                    // A global partner records their own sale; back-office staff record on someone's behalf.
                    'agent_id' => $recorder->hasAnyRole(UserPolicy::SEARCH_ROLES) ? null : $recorder->agent()->value('id'),
                    'recorded_by' => $recorder->id,
                    'project_property_type_id' => $typeId,
                    ...ProjectPropertyType::measurements($typeId, $data),
                    'unit_number' => $data['unit_no'],
                    'unit_quantity' => $data['unit_quantity'],
                    'total_contract_price' => $data['total_contract_price'],
                    'reservation_date' => $data['reservation_date'],
                    'sale_status' => 'pending',
                    'remarks' => $data['remarks'] ?? null,
                ]);

                $sale->client()->create([
                    'first_name' => $data['client_firstname'],
                    'middle_name' => $data['client_middlename'] ?? null,
                    'last_name' => $data['client_lastname'],
                    'email' => $data['client_email'] ?? null,
                    'age' => $data['client_age'] ?? null,
                    'gender' => $data['client_gender'] ?? null,
                    'mobile' => $data['client_mobile'],
                    'country' => $data['client_country'],
                    'address' => $data['client_address'] ?? null,
                ]);

                $sale->update(['proof_of_transaction' => $this->files->store($proofOfTransaction, "sales/international/{$sale->id}")]);

                return $sale;
            });
        } catch (Throwable $e) {
            $this->files->discardUploaded();

            throw $e;
        }

        // A new sale makes a dormant agent active again right away.
        if ($sale->agent_id) {
            $this->agentActivity->refresh([$sale->agent_id]);
        }

        $this->activity->describe(
            'sale.international.recorded',
            "Recorded international sale #{$sale->id}: unit {$sale->unit_number}",
            $sale,
            ['proof_of_transaction' => $sale->proof_of_transaction, ...$this->files->totals()],
        );

        return $sale;
    }
}
