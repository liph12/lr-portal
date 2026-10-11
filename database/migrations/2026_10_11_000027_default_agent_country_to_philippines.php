<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Agents with no country recorded are in the Philippines (a blank country already counted as local and was placed in an
// area by state, exactly as PH is, so neither agent type nor area changes). New agents get it from Agent::saving.
return new class extends Migration
{
    public function up(): void
    {
        DB::table('agents')
            ->where(fn ($q) => $q->whereNull('country_code')->orWhere('country_code', ''))
            ->where(fn ($q) => $q->whereNull('country')->orWhere('country', ''))
            ->update(['country_code' => 'PH', 'country' => 'Philippines']);
    }

    public function down(): void
    {
        // Not reversible: PH set here can't be told apart from PH recorded in legacy.
    }
};
