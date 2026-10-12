<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// What each person may change inside Management. The roles that run Management today (superadmin, admin) get all of
// them, so nothing changes until a box is unticked in Settings › Roles & permissions.
return new class extends Migration
{
    private const PERMISSIONS = [
        'edit_designation' => 'Management: Edit agent designation',
        'transfer_agents' => 'Management: Transfer agents',
        'change_agent_status' => 'Management: Change agent status',
        'edit_teams' => 'Management: Edit teams & sub-teams',
        'change_team_status' => 'Management: Change team & sub-team status',
    ];

    public function up(): void
    {
        $roles = DB::table('roles')->whereIn('name', ['superadmin', 'admin'])->pluck('id');

        foreach (self::PERMISSIONS as $name => $label) {
            if (DB::table('permissions')->where('name', $name)->exists()) {
                continue;
            }
            $id = DB::table('permissions')->insertGetId(['name' => $name, 'label' => $label, 'created_at' => now(), 'updated_at' => now()]);
            DB::table('permission_role')->insert($roles->map(fn ($role) => ['role_id' => $role, 'permission_id' => $id])->all());
        }
    }

    public function down(): void
    {
        $ids = DB::table('permissions')->whereIn('name', array_keys(self::PERMISSIONS))->pluck('id');
        DB::table('permission_role')->whereIn('permission_id', $ids)->delete();
        DB::table('permissions')->whereIn('id', $ids)->delete();
    }
};
