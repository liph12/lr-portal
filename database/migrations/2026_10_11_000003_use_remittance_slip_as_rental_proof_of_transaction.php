<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// For rentals the remittance slip *is* the proof of transaction, so the separate column goes.
return new class extends Migration
{
    public function up(): void
    {
        DB::table('agent_rental_transactions')
            ->whereNull('remittance_slip')
            ->whereNotNull('proof_of_transaction')
            ->update(['remittance_slip' => DB::raw('proof_of_transaction')]);

        Schema::table('agent_rental_transactions', function (Blueprint $table) {
            $table->dropColumn('proof_of_transaction');
        });
    }

    public function down(): void
    {
        Schema::table('agent_rental_transactions', function (Blueprint $table) {
            $table->string('proof_of_transaction', 2048)->nullable()->after('partner_agent');
        });

        DB::table('agent_rental_transactions')->update(['proof_of_transaction' => DB::raw('remittance_slip')]);
    }
};
