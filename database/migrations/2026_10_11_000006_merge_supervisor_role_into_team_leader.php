<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// The legacy "Supervisor" is the Team Leader: move its users and permissions over and drop the duplicate role.
return new class extends Migration
{
    public function up(): void
    {
        $supervisor = DB::table('roles')->where('name', 'supervisor')->value('id');

        if (! $supervisor) {
            return;
        }

        $teamLeader = DB::table('roles')->where('name', 'team_leader')->value('id')
            ?? DB::table('roles')->insertGetId(['name' => 'team_leader', 'label' => 'Team Leader', 'created_at' => now(), 'updated_at' => now()]);

        DB::table('role_user')->insertOrIgnore(
            DB::table('role_user')->where('role_id', $supervisor)->get(['user_id'])
                ->map(fn ($r) => ['user_id' => $r->user_id, 'role_id' => $teamLeader])->all()
        );
        DB::table('permission_role')->insertOrIgnore(
            DB::table('permission_role')->where('role_id', $supervisor)->get(['permission_id'])
                ->map(fn ($r) => ['permission_id' => $r->permission_id, 'role_id' => $teamLeader])->all()
        );

        DB::table('role_user')->where('role_id', $supervisor)->delete();
        DB::table('permission_role')->where('role_id', $supervisor)->delete();
        DB::table('roles')->where('id', $supervisor)->delete();
    }

    public function down(): void
    {
        // Which team leaders were supervisors isn't recorded, so there's nothing to split back out.
    }
};
