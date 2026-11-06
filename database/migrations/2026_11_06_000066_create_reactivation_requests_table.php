<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// An agent's way back once FIRE_DEACTIVATE_AFTER_MONTHS passed with no first sale since FIRE activated them
// (AgentActivityService): a supporting file and optional notes, for the back office to review. Each submission is a
// row; ReactivationRequestService::latest reads the newest.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reactivation_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->constrained('agents')->cascadeOnDelete();
            $table->string('file', 500);
            $table->text('notes')->nullable();
            $table->string('status')->default('pending');
            $table->text('decline_reason')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->index(['agent_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reactivation_requests');
    }
};
