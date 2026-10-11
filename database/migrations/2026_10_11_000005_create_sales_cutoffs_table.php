<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// A month's sales close at its cutoff: only sales encoded by then count for that month.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_cutoffs', function (Blueprint $table) {
            $table->id();
            $table->char('month', 7)->unique();
            $table->dateTime('cutoff_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_cutoffs');
    }
};
