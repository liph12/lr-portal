<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Sales are recorded by portal users before agent profiles exist, so the agent link is optional.
        Schema::table('agent_transactions', function (Blueprint $table) {
            $table->foreignId('agent_id')->nullable()->change();
            $table->foreignId('recorded_by')->nullable()->after('agent_id')->constrained('users')->nullOnDelete();
            $table->string('sale_type')->nullable()->after('recorded_by');
        });

        // developer_projects is still empty, so the developer plus a typed project name identify the property.
        Schema::table('agent_project_transactions', function (Blueprint $table) {
            $table->foreignId('developer_project_id')->nullable()->change();
            $table->foreignId('developer_id')->nullable()->after('agent_transaction_id')->constrained()->nullOnDelete();
            $table->string('project_name')->nullable()->after('developer_id');
            $table->string('property_type')->nullable()->after('project_name');
            $table->string('unit_type')->nullable()->after('property_type');
            $table->decimal('floor_area', 10, 2)->nullable()->after('unit_type');
            $table->decimal('lot_area', 10, 2)->nullable()->after('floor_area');
        });

        Schema::table('agent_transaction_details', function (Blueprint $table) {
            $table->date('client_birthdate')->nullable()->after('client_mobile');
            $table->string('client_gender')->nullable()->after('client_birthdate');
            $table->text('client_address')->nullable()->after('client_country');
        });

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
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_transaction_files');

        Schema::table('agent_transaction_details', function (Blueprint $table) {
            $table->dropColumn(['client_birthdate', 'client_gender', 'client_address']);
        });

        Schema::table('agent_project_transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('developer_id');
            $table->dropColumn(['project_name', 'property_type', 'unit_type', 'floor_area', 'lot_area']);
            $table->foreignId('developer_project_id')->nullable(false)->change();
        });

        Schema::table('agent_transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('recorded_by');
            $table->dropColumn('sale_type');
            $table->foreignId('agent_id')->nullable(false)->change();
        });
    }
};
