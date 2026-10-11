<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Agents typed global_partner get the Global Partner role. Only plain agents move: a global partner who
// is also a team leader, admin, etc. keeps that role (one role per user).
return new class extends Migration
{
    public function up(): void
    {
        $agent = DB::table('roles')->where('name', 'agent')->value('id');
        $globalPartner = DB::table('roles')->where('name', 'global_partner')->value('id');

        if (! $agent || ! $globalPartner) {
            return;
        }

        DB::table('role_user')
            ->where('role_id', $agent)
            ->whereIn('user_id', DB::table('agents')->where('agent_type', 'global_partner')->select('user_id'))
            ->update(['role_id' => $globalPartner]);
    }

    public function down(): void
    {
        $agent = DB::table('roles')->where('name', 'agent')->value('id');
        $globalPartner = DB::table('roles')->where('name', 'global_partner')->value('id');

        if ($agent && $globalPartner) {
            DB::table('role_user')->where('role_id', $globalPartner)->update(['role_id' => $agent]);
        }
    }
};
