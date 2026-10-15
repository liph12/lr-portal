<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// SMS Manager (Semaphore): each send ("blast") and its recipients; team leaders' credits — requests paid outside the app with a
// proof of payment, approved by an SMS manager — kept as a ledger (balance = the sum of its changes).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sms_blasts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('message');
            $table->json('groups')->nullable();
            $table->unsignedInteger('custom_numbers')->default(0);
            $table->unsignedInteger('recipients')->default(0);
            $table->unsignedTinyInteger('parts')->default(1);
            $table->unsignedInteger('credits')->default(0);
            // Paid from the sender's own credits (false = the company's Semaphore balance).
            $table->boolean('charged')->default(false);
            $table->string('status', 20)->default('queued');
            $table->unsignedInteger('sent')->default(0);
            $table->unsignedInteger('failed')->default(0);
            $table->text('error')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
        });

        Schema::create('sms_blast_recipients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sms_blast_id')->constrained('sms_blasts')->cascadeOnDelete();
            $table->string('mobile', 20);
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 20)->default('queued');
            $table->timestamps();
            $table->index(['sms_blast_id', 'status']);
        });

        Schema::create('sms_credit_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('credits');
            $table->string('proof_of_payment', 500);
            $table->text('notes')->nullable();
            $table->string('status', 20)->default('pending');
            $table->unsignedInteger('credits_granted')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();
            $table->index(['status', 'created_at']);
        });

        Schema::create('sms_credit_ledger', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->integer('change');
            $table->string('reason', 20);
            $table->foreignId('sms_credit_request_id')->nullable()->constrained('sms_credit_requests')->nullOnDelete();
            $table->foreignId('sms_blast_id')->nullable()->constrained('sms_blasts')->nullOnDelete();
            $table->timestamps();
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sms_credit_ledger');
        Schema::dropIfExists('sms_credit_requests');
        Schema::dropIfExists('sms_blast_recipients');
        Schema::dropIfExists('sms_blasts');
    }
};
