<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// A rental may now name the developer and project of the unit (optional: direct-to-owner rentals have neither) — a listed
// project (developer_project_id, which already existed) or a typed name. A removed project no longer deletes the sale.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_rental_transactions', function (Blueprint $table) {
            $table->dropForeign(['developer_project_id']);
            $table->foreign('developer_project_id')->references('id')->on('developer_projects')->nullOnDelete();
            $table->foreignId('developer_id')->nullable()->after('agent_transaction_id')->constrained('developers')->nullOnDelete();
            $table->string('project_name')->nullable()->after('developer_id');
        });
    }

    public function down(): void
    {
        Schema::table('agent_rental_transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('developer_id');
            $table->dropColumn('project_name');
            $table->dropForeign(['developer_project_id']);
            $table->foreign('developer_project_id')->references('id')->on('developer_projects')->cascadeOnDelete();
        });
    }
};
