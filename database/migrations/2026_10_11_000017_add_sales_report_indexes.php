<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Sales reports filter every category by reservation date and sale status.
return new class extends Migration
{
    private const TABLES = ['agent_project_transactions', 'agent_rental_transactions', 'agent_brokerage_transactions'];

    public function up(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, fn (Blueprint $t) => $t->index('reservation_date'));
        }
        Schema::table('agent_transactions', fn (Blueprint $t) => $t->index('sale_status'));
    }

    public function down(): void
    {
        Schema::table('agent_transactions', fn (Blueprint $t) => $t->dropIndex(['sale_status']));
        foreach (self::TABLES as $table) {
            Schema::table($table, fn (Blueprint $t) => $t->dropIndex(['reservation_date']));
        }
    }
};
