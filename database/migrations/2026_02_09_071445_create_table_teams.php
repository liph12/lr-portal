<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('teams', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->string('logo')->nullable();
            $table->string('status')->nullable('active');
            $table->foreignId('agent_id')->constrained()->onDelete('cascade');
            $table->timestamps();
        });

        Schema::create('team_agents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->onDelete('cascade');
            $table->foreignId('agent_id')->constrained()->onDelete('cascade');
            $table->date('joined_at')->nullable();
            $table->date('transferred_at')->nullable();
            $table->string('status')->nullable('active');
            $table->timestamps();
        });

        Schema::create('sub_teams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->onDelete('cascade');
            $table->string('name')->nullable();
            $table->string('logo')->nullable();
            $table->string('status')->nullable('active');
            $table->foreignId('agent_id')->constrained()->onDelete('cascade');
            $table->timestamps();
        });

        Schema::create('sub_team_agents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sub_team_id')->constrained()->onDelete('cascade');
            $table->foreignId('agent_id')->constrained()->onDelete('cascade');
            $table->date('joined_at')->nullable();
            $table->date('transferred_at')->nullable();
            $table->string('status')->nullable('active');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('teams');
        Schema::dropIfExists('sub_teams');
        Schema::dropIfExists('team_agents');
        Schema::dropIfExists('sub_team_agents');
    }
};
