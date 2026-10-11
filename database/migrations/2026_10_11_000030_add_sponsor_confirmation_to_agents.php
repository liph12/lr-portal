<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// A global partner is confirmed by their sponsor (or the back office): legacy members.sponsor_activation_status =
// 'confirmed'. Null = still waiting; the Global Partners menu counts those.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->timestamp('sponsor_confirmed_at')->nullable()->after('activity');
            $table->foreignId('sponsor_confirmed_by')->nullable()->after('sponsor_confirmed_at')->constrained('users')->nullOnDelete();
            $table->index(['agent_type', 'sponsor_confirmed_at']);
        });
    }

    public function down(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->dropIndex(['agent_type', 'sponsor_confirmed_at']);
            $table->dropConstrainedForeignId('sponsor_confirmed_by');
            $table->dropColumn('sponsor_confirmed_at');
        });
    }
};
