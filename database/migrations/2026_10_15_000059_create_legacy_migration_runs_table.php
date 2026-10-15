<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Each `legacy:migrate` run and how its steps went (Settings › Legacy migration shows the latest).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('legacy_migration_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('started_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 20)->default('queued');
            $table->boolean('fresh')->default(false);
            $table->json('steps')->nullable();
            $table->text('error')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('legacy_migration_runs');
    }
};
