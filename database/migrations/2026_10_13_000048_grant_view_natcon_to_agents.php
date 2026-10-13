<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Agents see NATCON too — only their own NATCON sales (My NATCON sales); the boards stay with the back office and leaders.
return new class extends Migration
{
    public function up(): void
    {
        $permission = DB::table('permissions')->where('name', 'view_natcon')->value('id');
        $role = DB::table('roles')->where('name', 'agent')->value('id');
        if ($permission && $role) {
            DB::table('permission_role')->insertOrIgnore(['role_id' => $role, 'permission_id' => $permission]);
        }
    }

    public function down(): void
    {
        $permission = DB::table('permissions')->where('name', 'view_natcon')->value('id');
        $role = DB::table('roles')->where('name', 'agent')->value('id');
        DB::table('permission_role')->where(['role_id' => $role, 'permission_id' => $permission])->delete();
    }
};
