<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('agent_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->constrained()->onDelete('cascade');
            $table->string('unit_number')->nullable();
            $table->string('commission_status')->nullable();
            $table->string('term_of_payment')->nullable();
            $table->string('property_details')->nullable();
            $table->string('remarks')->nullable();
            $table->string('sale_status')->nullable();
            $table->json('update_logs')->nullable();
            $table->timestamps();
        });

        Schema::create('agent_rental_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_transaction_id')->constrained()->onDelete('cascade');
            $table->date('remittance_date')->nullable();
            $table->string('deposit_slip')->nullable();
            $table->string('remittance_slip')->nullable();
            $table->double('commission_received')->default(0);
            $table->double('total_contract_price')->default(0);
            $table->foreignId('developer_project_id')->constrained()->onDelete('cascade');
            $table->timestamps();
        });

        Schema::create('agent_brokerage_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_transaction_id')->constrained()->onDelete('cascade');
            $table->date('remittance_date')->nullable();
            $table->string('deposit_slip')->nullable();
            $table->string('remittance_slip')->nullable();
            $table->double('commission_received')->default(0);
            $table->double('total_contract_price')->default(0);
            $table->foreignId('brokerage_area_id')->constrained()->onDelete('cascade');
            $table->timestamps();
        });

        Schema::create('agent_project_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_transaction_id')->constrained()->onDelete('cascade');
            $table->date('reservation_date')->nullable();
            $table->string('proof_of_transaction')->nullable();
            $table->double('total_contract_price')->default(0);
            $table->foreignId('developer_project_id')->constrained()->onDelete('cascade');
            $table->timestamps();
        });

        Schema::create('agent_transaction_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_transaction_id')->constrained()->onDelete('cascade');
            $table->string('client_first_name')->nullable();
            $table->string('client_middle_name')->nullable();
            $table->string('client_last_name')->nullable();
            $table->string('client_email')->nullable();
            $table->string('client_mobile')->nullable();
            $table->string('client_country')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agent_transactions');
    }
};
