<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

// A project sale has exactly one proof of transaction, stored as its full S3 URL on the sale itself.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_project_transactions', function (Blueprint $table) {
            $table->string('proof_of_transaction', 2048)->nullable()->change();
        });

        DB::table('agent_transaction_files')
            ->orderBy('id')
            ->each(function ($file) {
                DB::table('agent_project_transactions')
                    ->where('agent_transaction_id', $file->agent_transaction_id)
                    ->whereNull('proof_of_transaction')
                    ->update(['proof_of_transaction' => Storage::disk($file->disk)->url($file->path)]);
            });

        Schema::dropIfExists('agent_transaction_files');
    }

    public function down(): void
    {
        Schema::create('agent_transaction_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_transaction_id')->constrained()->cascadeOnDelete();
            $table->string('category')->default('proof_of_transaction');
            $table->string('disk');
            $table->string('path');
            $table->string('original_name');
            $table->string('mime_type');
            $table->string('content_encoding')->nullable();
            $table->unsignedBigInteger('original_size');
            $table->unsignedBigInteger('stored_size');
            $table->timestamps();
        });

        // Sizes and original names weren't kept on the sale, so restored rows only carry the location.
        DB::table('agent_project_transactions')
            ->whereNotNull('proof_of_transaction')
            ->orderBy('id')
            ->each(function ($sale) {
                $path = ltrim((string) parse_url($sale->proof_of_transaction, PHP_URL_PATH), '/');

                DB::table('agent_transaction_files')->insert([
                    'agent_transaction_id' => $sale->agent_transaction_id,
                    'disk' => config('filesystems.sale_files_disk'),
                    'path' => $path,
                    'original_name' => basename($path),
                    'mime_type' => 'application/octet-stream',
                    'original_size' => 0,
                    'stored_size' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });

        Schema::table('agent_project_transactions', function (Blueprint $table) {
            $table->string('proof_of_transaction')->nullable()->change();
        });
    }
};
