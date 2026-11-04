<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Recruits Progress › AI analysis (each one is a paid OpenAI call), its own permission: every role that can open Recruits Progress
// gets it (and the superadmin), so nothing is hidden until a box is unticked.
return new class extends Migration
{
    private const NAME = 'report_recruits_ai_analysis';

    public function up(): void
    {
        if (DB::table('permissions')->where('name', self::NAME)->exists()) {
            return;
        }
        $roles = DB::table('roles')->where('name', 'superadmin')
            ->orWhereIn('id', DB::table('permission_role as pr')->join('permissions as p', 'p.id', '=', 'pr.permission_id')->where('p.name', 'report_recruits_progress')->select('pr.role_id'))
            ->pluck('id');
        $id = DB::table('permissions')->insertGetId(['name' => self::NAME, 'label' => 'Report: Recruits Progress AI analysis', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('permission_role')->insert($roles->map(fn ($role) => ['role_id' => $role, 'permission_id' => $id])->all());
    }

    public function down(): void
    {
        $id = DB::table('permissions')->where('name', self::NAME)->value('id');
        DB::table('permission_role')->where('permission_id', $id)->delete();
        DB::table('permissions')->where('id', $id)->delete();
    }
};
