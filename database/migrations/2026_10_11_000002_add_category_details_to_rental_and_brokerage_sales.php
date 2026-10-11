<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Property details per sale category (legacy salesreport.prop_details JSON), mirroring what
// agent_project_transactions already has for project sales.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_rental_transactions', function (Blueprint $table) {
            // A rental is not a developer sale; the project link stays only for the rare listed project.
            $table->foreignId('developer_project_id')->nullable()->change();

            $table->foreignId('project_property_type_id')->nullable()->after('agent_transaction_id')->constrained()->nullOnDelete();
            $table->date('reservation_date')->nullable()->after('project_property_type_id');
            $table->string('unit_type')->nullable()->after('reservation_date');
            $table->decimal('floor_area', 10, 2)->nullable()->after('unit_type');
            $table->decimal('lot_area', 10, 2)->nullable()->after('floor_area');
            $table->string('property_size')->nullable()->after('lot_area');
            $table->decimal('rental_rate', 14, 2)->nullable()->after('property_size');
            $table->string('closing_agent')->nullable()->after('rental_rate');
            $table->string('partner_agent')->nullable()->after('closing_agent');
            $table->string('proof_of_transaction', 2048)->nullable()->after('partner_agent');
        });

        Schema::table('agent_brokerage_transactions', function (Blueprint $table) {
            $table->foreignId('project_property_type_id')->nullable()->after('agent_transaction_id')->constrained()->nullOnDelete();
            $table->date('reservation_date')->nullable()->after('project_property_type_id');
            $table->string('unit_type')->nullable()->after('reservation_date');
            $table->decimal('floor_area', 10, 2)->nullable()->after('unit_type');
            $table->decimal('lot_area', 10, 2)->nullable()->after('floor_area');
            $table->string('proof_of_transaction', 2048)->nullable()->after('lot_area');
        });
    }

    public function down(): void
    {
        Schema::table('agent_brokerage_transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('project_property_type_id');
            $table->dropColumn(['reservation_date', 'unit_type', 'floor_area', 'lot_area', 'proof_of_transaction']);
        });

        Schema::table('agent_rental_transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('project_property_type_id');
            $table->dropColumn([
                'reservation_date', 'unit_type', 'floor_area', 'lot_area', 'property_size',
                'rental_rate', 'closing_agent', 'partner_agent', 'proof_of_transaction',
            ]);
            $table->foreignId('developer_project_id')->nullable(false)->change();
        });
    }
};
