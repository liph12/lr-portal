<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Data migration so existing installs get the permission; Settings › Roles & permissions grants it.
return new class extends Migration
{
    public function up(): void
    {
        if (DB::table('permissions')->where('name', 'view_leaderboards')->exists()) {
            return;
        }

        $id = DB::table('permissions')->insertGetId([
            'name' => 'view_leaderboards',
            'label' => 'View Sales Leaderboards',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Superadmin always holds every permission (RolePermissionService keeps that invariant too).
        $superadmin = DB::table('roles')->where('name', 'superadmin')->value('id');
        if ($superadmin) {
            DB::table('permission_role')->insert(['role_id' => $superadmin, 'permission_id' => $id]);
        }
    }

    public function down(): void
    {
        $id = DB::table('permissions')->where('name', 'view_leaderboards')->value('id');

        if ($id) {
            DB::table('permission_role')->where('permission_id', $id)->delete();
            DB::table('permissions')->where('id', $id)->delete();
        }
    }
};
