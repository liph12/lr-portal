<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// The NATCON rankings: every role that can read reports gets them, so nothing is hidden until a box is unticked.
return new class extends Migration
{
    public function up(): void
    {
        if (DB::table('permissions')->where('name', 'view_natcon')->exists()) {
            return;
        }
        $roles = DB::table('roles')->where('name', 'superadmin')
            ->orWhereIn('id', DB::table('permission_role as pr')->join('permissions as p', 'p.id', '=', 'pr.permission_id')->where('p.name', 'view_reports')->select('pr.role_id'))
            ->pluck('id');
        $id = DB::table('permissions')->insertGetId(['name' => 'view_natcon', 'label' => 'View NATCON rankings', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('permission_role')->insert($roles->map(fn ($role) => ['role_id' => $role, 'permission_id' => $id])->all());
    }

    public function down(): void
    {
        $id = DB::table('permissions')->where('name', 'view_natcon')->value('id');
        DB::table('permission_role')->where('permission_id', $id)->delete();
        DB::table('permissions')->where('id', $id)->delete();
    }
};
