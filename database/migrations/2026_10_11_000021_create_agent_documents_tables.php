<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Agents' requirement documents (PRC, DHSUD, contract, CPD, new entry), reviewed under Documentation. Every upload is
// kept; is_current marks the latest one of each type per agent (legacy member_docs.renewed_status = 'stable').
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agent_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->constrained('agents')->cascadeOnDelete();
            $table->string('type', 20);
            $table->text('file_url');
            $table->string('file_name')->nullable();
            $table->string('status', 20)->default('pending')->index();
            $table->boolean('is_current')->default(false);
            // Shown to the agent: why it was sent back, what to fix.
            $table->text('remarks')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['agent_id', 'type', 'is_current']);
            $table->index(['is_current', 'status', 'created_at']);
        });

        // Internal notes between reviewers about one document.
        Schema::create('agent_document_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_document_id')->constrained('agent_documents')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('body');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_document_comments');
        Schema::dropIfExists('agent_documents');
    }
};
