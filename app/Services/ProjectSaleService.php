<?php

namespace App\Services;

use App\Models\Entities\AgentTransaction;
use App\Models\Entities\DeveloperProject;
use App\Models\Entities\ProjectPropertyType;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Throwable;

class ProjectSaleService
{
    public function __construct(
        private SaleFileStorage $files,
        private ActivityLogger $activity,
    ) {}

    /**
     * @param  array<string, mixed>  $data  validated StoreProjectSaleRequest input
     */
    public function record(array $data, UploadedFile $proofOfTransaction, User $recorder): AgentTransaction
    {
        try {
            $transaction = DB::transaction(function () use ($data, $proofOfTransaction, $recorder) {
                $transaction = SaleRecord::create(AgentTransaction::TYPE_PROJECT, $data, $recorder);
                $projectId = $data['developer_project_id'] ?? null;
                $typeId = (int) $data['project_property_type_id'];

                $transaction->projectTransaction()->create([
                    'developer_id' => $data['developer_id'],
                    'developer_project_id' => $projectId,
                    // Snapshot the catalogue name so the sale still reads correctly if the project is renamed.
                    'project_name' => $projectId ? DeveloperProject::whereKey($projectId)->value('name') : $data['project_name'],
                    'project_property_type_id' => $typeId,
                    ...ProjectPropertyType::measurements($typeId, $data),
                    'reservation_date' => $data['reservation_date'],
                    'proof_of_transaction' => $this->files->store($proofOfTransaction, "sales/project/{$transaction->id}"),
                    'total_contract_price' => $data['total_contract_price'],
                ]);

                return $transaction;
            });
        } catch (Throwable $e) {
            $this->files->discardUploaded();

            throw $e;
        }

        $project = $transaction->projectTransaction;

        $this->activity->describe(
            'sale.project.recorded',
            "Recorded project sale #{$transaction->id}: {$project->project_name}, unit {$transaction->unit_number}",
            $transaction,
            ['proof_of_transaction' => $project->proof_of_transaction, ...$this->files->totals()],
        );

        return $transaction;
    }
}
