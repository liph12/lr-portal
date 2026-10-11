<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Management lists ~83k agents sorted by name, each joined to its one active team / sub-team stint.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->index('name'));
        Schema::table('team_agents', fn (Blueprint $table) => $table->index(['agent_id', 'status']));
        Schema::table('sub_team_agents', fn (Blueprint $table) => $table->index(['agent_id', 'status']));
    }

    public function down(): void
    {
        Schema::table('sub_team_agents', fn (Blueprint $table) => $table->dropIndex(['agent_id', 'status']));
        Schema::table('team_agents', fn (Blueprint $table) => $table->dropIndex(['agent_id', 'status']));
        Schema::table('users', fn (Blueprint $table) => $table->dropIndex(['name']));
    }
};
