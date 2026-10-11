<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Statistics (/{superadmin,admin,staff}/statistics) gets its own permission instead of riding on view_reports. Every
// role that could open it (view_reports) keeps it, so nothing changes until a box is unticked in Settings.
return new class extends Migration
{
    public function up(): void
    {
        if (DB::table('permissions')->where('name', 'view_statistics')->exists()) {
            return;
        }

        $id = DB::table('permissions')->insertGetId(['name' => 'view_statistics', 'label' => 'View Statistics', 'created_at' => now(), 'updated_at' => now()]);

        $roles = DB::table('roles')->where('name', 'superadmin')
            ->orWhereIn('id', DB::table('permission_role as pr')->join('permissions as p', 'p.id', '=', 'pr.permission_id')->where('p.name', 'view_reports')->select('pr.role_id'))
            ->pluck('id');
        DB::table('permission_role')->insert($roles->map(fn ($role) => ['role_id' => $role, 'permission_id' => $id])->all());
    }

    public function down(): void
    {
        $id = DB::table('permissions')->where('name', 'view_statistics')->value('id');
        if ($id) {
            DB::table('permission_role')->where('permission_id', $id)->delete();
            DB::table('permissions')->where('id', $id)->delete();
        }
    }
};
