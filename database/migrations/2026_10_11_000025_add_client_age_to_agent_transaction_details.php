<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// The client's age at the sale (legacy salesreport.clientAge; new sales from the birthdate). Stored as recorded;
// statistics only count believable ages (App\Support\ClientStats).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_transaction_details', function (Blueprint $table) {
            $table->unsignedSmallInteger('client_age')->nullable()->after('client_birthdate');
        });
    }

    public function down(): void
    {
        Schema::table('agent_transaction_details', function (Blueprint $table) {
            $table->dropColumn('client_age');
        });
    }
};
