<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// NATCON editions (NATCON 2026, 2027…): each its own period, a specific cutoff (sales encoded by then count), qualifier amount and
// Top Rent Managers period / cutoff date. One is the default (/natcon). NATCON 2026 is made from the single setting it replaces.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('natcon_editions', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('year')->unique();
            $table->string('name', 100);
            $table->date('from');
            $table->date('to');
            $table->dateTime('cutoff_at')->nullable();
            $table->decimal('qualifier_amount', 15, 2);
            $table->date('rental_from');
            $table->date('rental_to');
            $table->date('rental_cutoff');
            $table->boolean('is_default')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        $saved = (array) json_decode((string) DB::table('app_settings')->where('key', 'natcon')->value('value'), true);
        $s = $saved + [
            'from' => '2025-08-01', 'to' => '2026-07-31', 'cutoff_month' => '2026-07', 'qualifier_amount' => 43000000,
            'rental_from' => '2025-09-01', 'rental_to' => '2026-08-31', 'rental_cutoff' => '2026-09-05',
        ];
        DB::table('natcon_editions')->insert([
            'year' => 2026, 'name' => 'NATCON 2026', 'from' => $s['from'], 'to' => $s['to'],
            // The monthly cutoff it went by, as a specific moment (none yet = open).
            'cutoff_at' => DB::table('sales_cutoffs')->where('month', $s['cutoff_month'])->value('cutoff_at'),
            'qualifier_amount' => $s['qualifier_amount'], 'rental_from' => $s['rental_from'], 'rental_to' => $s['rental_to'],
            'rental_cutoff' => $s['rental_cutoff'], 'is_default' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('natcon_editions');
    }
};
