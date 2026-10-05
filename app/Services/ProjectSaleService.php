<?php

namespace App\Services;

use App\Models\Entities\AgentTransaction;
use App\Models\Entities\AgentTransactionFile;
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
    public function __construct(private FileCompressionService $compressor) {}

    /**
     * @param  array<string, mixed>  $data  validated StoreProjectSaleRequest input
     * @param  UploadedFile[]  $files
     */
    public function record(array $data, array $files, User $recorder): AgentTransaction
    {
        $diskName = config('filesystems.sale_files_disk');
        $disk = Storage::disk($diskName);
        $uploaded = [];

        try {
            return DB::transaction(function () use ($data, $files, $recorder, $disk, $diskName, &$uploaded) {
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

                $transaction->projectTransaction()->create([
                    'developer_id' => $data['developer_id'],
                    'project_name' => $data['project_name'],
                    'property_type' => $data['property_type'],
                    'unit_type' => $data['unit_type'] ?? null,
                    'floor_area' => $data['floor_area'] ?? null,
                    'lot_area' => $data['lot_area'] ?? null,
                    'reservation_date' => $data['reservation_date'],
                    'total_contract_price' => $data['total_contract_price'],
                ]);

                foreach ($files as $file) {
                    $uploaded[] = $this->storeFile($transaction, $file, $disk, $diskName);
                }

                return $transaction;
            });
        } catch (Throwable $e) {
            // The DB rows roll back on their own; objects already sent to the bucket don't.
            if ($uploaded) {
                $disk->delete($uploaded);
            }

            throw $e;
        }
    }

    private function storeFile(AgentTransaction $transaction, UploadedFile $file, Filesystem $disk, string $diskName): string
    {
        $compressed = $this->compressor->compress($file);
        $path = sprintf('sales/project/%d/%s.%s', $transaction->id, Str::uuid(), $compressed->extension);
        $originalName = $file->getClientOriginalName();

        $options = array_filter([
            'visibility' => 'private',
            'ContentType' => $compressed->mimeType,
            'ContentEncoding' => $compressed->contentEncoding,
            'ContentDisposition' => 'inline; filename="'.addcslashes(Str::ascii($originalName), '"\\').'"',
        ]);

        if (! $disk->put($path, $compressed->contents, $options)) {
            throw new RuntimeException("Could not upload {$originalName} to the [{$diskName}] disk.");
        }

        $transaction->files()->create([
            'category' => AgentTransactionFile::CATEGORY_PROOF_OF_TRANSACTION,
            'disk' => $diskName,
            'path' => $path,
            'original_name' => $originalName,
            'mime_type' => $compressed->mimeType,
            'content_encoding' => $compressed->contentEncoding,
            'original_size' => $compressed->originalSize,
            'stored_size' => $compressed->size(),
        ]);

        return $path;
    }
}
