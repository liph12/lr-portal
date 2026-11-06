<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// fire_activated_at: FIRE completes an agent's activation (replacing the old first-sale gate) when they've never sold —
// AgentActivityService::dormant uses it for the FIRE_DEACTIVATE_AFTER_MONTHS-with-no-first-sale rule, and it's reset
// when a reactivation request is approved. fire_welcome_watched_at: seen the welcome video before the modules open.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_attributes', function (Blueprint $table) {
            $table->timestamp('fire_activated_at')->nullable()->after('fire_certificates');
            $table->timestamp('fire_welcome_watched_at')->nullable()->after('fire_activated_at');
        });
    }

    public function down(): void
    {
        Schema::table('agent_attributes', function (Blueprint $table) {
            $table->dropColumn(['fire_activated_at', 'fire_welcome_watched_at']);
        });
    }
};
