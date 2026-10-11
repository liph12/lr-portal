<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Database\Migrations\Migration;

// Sales reserved before 4 Jan 2017 were never reviewed in the old system: a blank validSale (imported as
// "pending") counts as valid. Ones marked invalid or cancelled keep that status.
return new class extends Migration
{
    private const CUTOFF = '2017-01-04';

    private const TABLES = ['agent_project_transactions', 'agent_rental_transactions', 'agent_brokerage_transactions'];

    public function up(): void
    {
        foreach (self::TABLES as $table) {
            DB::table('agent_transactions')
                ->where('sale_status', 'pending')
                ->whereIn('id', DB::table($table)->select('agent_transaction_id')->where('reservation_date', '<', self::CUTOFF))
                ->update(['sale_status' => 'valid']);
        }
    }

    public function down(): void
    {
        // Which of these were pending before isn't recorded; restore from the backup taken before this ran.
    }
};
