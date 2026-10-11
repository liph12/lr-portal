<?php

namespace App\Services;

use App\Models\Entities\AgentTransaction;
use App\Models\Entities\DeveloperProject;
use App\Models\User;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class ProjectSaleService
{
    public function __construct(
        private FileCompressionService $compressor,
        private ActivityLogger $activity,
    ) {}

    /**
     * @param  array<string, mixed>  $data  validated StoreProjectSaleRequest input
     */
    public function record(array $data, UploadedFile $proofOfTransaction, User $recorder): AgentTransaction
    {
        $diskName = config('filesystems.sale_files_disk');
        $disk = Storage::disk($diskName);
        $uploadedPath = null;
        $compressed = null;

        try {
            $transaction = DB::transaction(function () use ($data, $proofOfTransaction, $recorder, $disk, $diskName, &$uploadedPath, &$compressed) {
                $transaction = AgentTransaction::create([
                    'recorded_by' => $recorder->id,
                    'sale_type' => AgentTransaction::TYPE_PROJECT,
                    'unit_number' => $data['unit_no'],
                    'commission_status' => $data['commission_status'],
                    'term_of_payment' => $data['payment_terms'],
                    'remarks' => $data['remarks'] ?? null,
                    'sale_status' => 'pending',
                ]);

                $transaction->detail()->create([
                    'client_first_name' => $data['client_firstname'],
                    'client_middle_name' => $data['client_middlename'] ?? null,
                    'client_last_name' => $data['client_lastname'],
                    'client_email' => $data['client_email'] ?? null,
                    'client_mobile' => $data['client_mobile'],
                    'client_birthdate' => $data['client_birthdate'] ?? null,
                    'client_gender' => $data['client_gender'] ?? null,
                    'client_country' => $data['client_country'],
                    'client_address' => $data['client_address'] ?? null,
                ]);

                $compressed = $this->compressor->compress($proofOfTransaction);
                $uploadedPath = $this->upload($transaction, $proofOfTransaction, $compressed, $disk, $diskName);

                $projectId = $data['developer_project_id'] ?? null;

                $transaction->projectTransaction()->create([
                    'developer_id' => $data['developer_id'],
                    'developer_project_id' => $projectId,
                    // Snapshot the catalogue name so the sale still reads correctly if the project is renamed.
                    'project_name' => $projectId ? DeveloperProject::whereKey($projectId)->value('name') : $data['project_name'],
                    'project_property_type_id' => $data['project_property_type_id'],
                    'unit_type' => $data['unit_type'] ?? null,
                    'floor_area' => $data['floor_area'] ?? null,
                    'lot_area' => $data['lot_area'] ?? null,
                    'reservation_date' => $data['reservation_date'],
                    'proof_of_transaction' => $disk->url($uploadedPath),
                    'total_contract_price' => $data['total_contract_price'],
                ]);

                return $transaction;
            });
        } catch (Throwable $e) {
            // The DB rows roll back on their own; an object already sent to the bucket doesn't.
            if ($uploadedPath) {
                $disk->delete($uploadedPath);
            }

            throw $e;
        }

        $project = $transaction->projectTransaction;

        $this->activity->describe(
            'sale.project.recorded',
            "Recorded project sale #{$transaction->id}: {$project->project_name}, unit {$transaction->unit_number}",
            $transaction,
            [
                'proof_of_transaction' => $project->proof_of_transaction,
                'bytes_uploaded' => $compressed->originalSize,
                'bytes_stored' => $compressed->size(),
            ],
        );

        return $transaction;
    }

    private function upload(
        AgentTransaction $transaction,
        UploadedFile $file,
        CompressedFile $compressed,
        Filesystem $disk,
        string $diskName,
    ): string {
        $path = sprintf('sales/project/%d/%s.%s', $transaction->id, Str::uuid(), $compressed->extension);
        $originalName = $file->getClientOriginalName();

        // No ACL is sent: proof_of_transaction stores the plain object URL, so access follows the bucket policy.
        $options = array_filter([
            'ContentType' => $compressed->mimeType,
            'ContentEncoding' => $compressed->contentEncoding,
            'ContentDisposition' => 'inline; filename="'.addcslashes(Str::ascii($originalName), '"\\').'"',
        ]);

        if (! $disk->put($path, $compressed->contents, $options)) {
            throw new RuntimeException("Could not upload {$originalName} to the [{$diskName}] disk.");
        }

        return $path;
    }
}
