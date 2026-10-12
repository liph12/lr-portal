<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Receiving a brokerage sale is signed: the receiver's drawn signature (a PNG, also stamped on the commission slip).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_brokerage_transactions', function (Blueprint $table) {
            $table->string('received_signature')->nullable()->after('received_at');
        });
    }

    public function down(): void
    {
        Schema::table('agent_brokerage_transactions', function (Blueprint $table) {
            $table->dropColumn('received_signature');
        });
    }
};
