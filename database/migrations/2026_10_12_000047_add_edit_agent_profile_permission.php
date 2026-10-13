<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Editing agents' profiles and uplines from the agent profile page: superadmin and admin.
return new class extends Migration
{
    public function up(): void
    {
        if (DB::table('permissions')->where('name', 'edit_agent_profile')->exists()) {
            return;
        }
        $id = DB::table('permissions')->insertGetId(['name' => 'edit_agent_profile', 'label' => 'Management: Edit agent profile & upline', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('permission_role')->insert(DB::table('roles')->whereIn('name', ['superadmin', 'admin'])->pluck('id')->map(fn ($role) => ['role_id' => $role, 'permission_id' => $id])->all());
    }

    public function down(): void
    {
        $id = DB::table('permissions')->where('name', 'edit_agent_profile')->value('id');
        DB::table('permission_role')->where('permission_id', $id)->delete();
        DB::table('permissions')->where('id', $id)->delete();
    }
};
