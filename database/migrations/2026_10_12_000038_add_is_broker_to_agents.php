<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Broker is an identifier on the agent, not a role: an agent, unit manager or team leader can each be a broker.
// Filled from legacy members.membertype by legacy:import-brokers, then set in Management › Agents.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->boolean('is_broker')->default(false)->after('agent_type')->index();
        });
    }

    public function down(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->dropColumn('is_broker');
        });
    }
};
