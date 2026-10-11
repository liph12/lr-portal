<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Teams and sub-teams are active, inactive (paused) or deactivated (closed); legacy "resigned" teams were closed.
return new class extends Migration
{
    public function up(): void
    {
        foreach (['teams', 'sub_teams'] as $table) {
            DB::table($table)->where('status', 'resigned')->update(['status' => 'deactivated']);
            DB::table($table)->whereNotIn('status', ['active', 'inactive', 'deactivated'])->orWhereNull('status')->update(['status' => 'inactive']);
        }
    }

    public function down(): void
    {
        DB::table('teams')->where('status', 'deactivated')->update(['status' => 'resigned']);
        DB::table('sub_teams')->where('status', 'deactivated')->update(['status' => 'inactive']);
    }
};
