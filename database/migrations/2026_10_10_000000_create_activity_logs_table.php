<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            // Kept when the user is deleted so the trail survives; the name/email snapshot below still identifies them.
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('user_name')->nullable();
            $table->string('user_email')->nullable();
            $table->string('action');
            $table->string('description')->nullable();
            $table->nullableMorphs('subject');
            $table->string('method', 10);
            $table->string('route_name')->nullable();
            $table->string('path', 2048);
            $table->unsignedSmallInteger('status_code')->nullable();
            $table->string('outcome', 32);
            $table->json('payload')->nullable();
            $table->json('properties')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 512)->nullable();
            $table->unsignedInteger('duration_ms')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['user_id', 'created_at']);
            $table->index(['action', 'created_at']);
            $table->index(['outcome', 'created_at']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
