<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// An agent's request to activate their LR account (legacy members.activationForm): the signed request for activation and the
// proof of transaction of the sale waiting to be encoded. Each submission is a row; the newest is the one that counts.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activation_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->constrained('agents')->cascadeOnDelete();
            $table->string('request_form', 500);
            $table->string('proof_of_transaction', 500);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['agent_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activation_requests');
    }
};
