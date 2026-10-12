<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Designations set in Management › Agents, each with the date it took effect: broker, and unit manager either by rate
// (a designation only — the person keeps their role and dashboard) or by dashboard (the Unit Manager role).
// Existing unit managers are "by dashboard" with no recorded date.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->date('broker_since')->nullable()->after('is_broker');
            $table->string('unit_manager_by', 16)->nullable()->after('broker_since')->index();
            $table->date('unit_manager_since')->nullable()->after('unit_manager_by');
        });

        DB::table('agents')
            ->whereIn('user_id', DB::table('role_user')->join('roles', 'roles.id', '=', 'role_user.role_id')->where('roles.name', 'unit_manager')->select('role_user.user_id'))
            ->update(['unit_manager_by' => 'dashboard']);
    }

    public function down(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->dropIndex(['unit_manager_by']);
            $table->dropColumn(['broker_since', 'unit_manager_by', 'unit_manager_since']);
        });
    }
};
