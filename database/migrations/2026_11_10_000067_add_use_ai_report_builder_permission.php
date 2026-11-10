<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Report Builder's "Ask AI" bar (each request is a paid OpenAI call): superadmin only for now — Report Builder
// itself isn't open to any other role yet.
return new class extends Migration
{
    private const NAME = 'use_ai_report_builder';

    public function up(): void
    {
        if (DB::table('permissions')->where('name', self::NAME)->exists()) {
            return;
        }
        $roles = DB::table('roles')->where('name', 'superadmin')->pluck('id');
        $id = DB::table('permissions')->insertGetId(['name' => self::NAME, 'label' => 'Report Builder: Ask AI', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('permission_role')->insert($roles->map(fn ($role) => ['role_id' => $role, 'permission_id' => $id])->all());
    }

    public function down(): void
    {
        $id = DB::table('permissions')->where('name', self::NAME)->value('id');
        DB::table('permission_role')->where('permission_id', $id)->delete();
        DB::table('permissions')->where('id', $id)->delete();
    }
};
