<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Sales by global partners (legacy international_sales_report). Kept apart from agent_transactions: they
// have their own ids (legacy ids are kept) and no developer/commission workflow. The client is split into
// its own 1:1 table so sale facts and client facts each depend only on their own key.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('international_sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('project_property_type_id')->nullable()->constrained()->nullOnDelete();
            $table->string('unit_number');
            $table->unsignedSmallInteger('unit_quantity')->default(1);
            $table->string('unit_type')->nullable();
            $table->decimal('floor_area', 10, 2)->nullable();
            $table->decimal('lot_area', 10, 2)->nullable();
            $table->decimal('total_contract_price', 15, 2)->default(0);
            $table->date('reservation_date')->nullable()->index();
            $table->string('proof_of_transaction', 2048)->nullable();
            $table->string('sale_status', 20)->default('pending')->index();
            $table->text('remarks')->nullable();
            $table->json('update_logs')->nullable();
            $table->timestamps();
        });

        Schema::create('international_sale_clients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('international_sale_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('first_name', 100);
            $table->string('middle_name', 100)->nullable();
            $table->string('last_name', 100)->nullable();
            $table->string('email')->nullable();
            $table->unsignedTinyInteger('age')->nullable();
            $table->string('gender', 10)->nullable();
            $table->string('mobile', 30)->nullable();
            $table->string('country', 100)->nullable();
            $table->text('address')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('international_sale_clients');
        Schema::dropIfExists('international_sales');
    }
};
