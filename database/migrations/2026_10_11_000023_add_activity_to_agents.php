<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// When an agent was activated (legacy members.dateactivated) moves from agent_attributes onto agents, next to the
// activity it drives: dormant after 6 months without a sale (AgentActivityService). Activity never blocks sign-in.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->timestamp('activated_at')->nullable()->after('agent_type')->index();
            $table->string('activity', 10)->default('active')->after('activated_at')->index();
        });

        DB::table('agents')->whereIn('id', DB::table('agent_attributes')->whereNotNull('date_activated')->select('agent_id'))
            ->update(['activated_at' => DB::table('agent_attributes')->whereColumn('agent_attributes.agent_id', 'agents.id')->select('date_activated')->limit(1)]);

        Schema::table('agent_attributes', function (Blueprint $table) {
            $table->dropColumn('date_activated');
        });
    }

    public function down(): void
    {
        Schema::table('agent_attributes', function (Blueprint $table) {
            $table->dateTime('date_activated')->nullable();
        });

        DB::table('agent_attributes')->whereIn('agent_id', DB::table('agents')->whereNotNull('activated_at')->select('id'))
            ->update(['date_activated' => DB::table('agents')->whereColumn('agents.id', 'agent_attributes.agent_id')->select('activated_at')->limit(1)]);

        Schema::table('agents', function (Blueprint $table) {
            $table->dropIndex(['activity']);
            $table->dropIndex(['activated_at']);
            $table->dropColumn(['activated_at', 'activity']);
        });
    }
};
