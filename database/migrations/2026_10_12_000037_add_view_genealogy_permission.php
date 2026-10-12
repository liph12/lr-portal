<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Genealogy (the recruit tree) is for everyone — their own downline at least — so every existing role gets it.
return new class extends Migration
{
    public function up(): void
    {
        if (DB::table('permissions')->where('name', 'view_genealogy')->exists()) {
            return;
        }
        $id = DB::table('permissions')->insertGetId(['name' => 'view_genealogy', 'label' => 'View genealogy', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('permission_role')->insert(DB::table('roles')->pluck('id')->map(fn ($role) => ['role_id' => $role, 'permission_id' => $id])->all());
    }

    public function down(): void
    {
        $id = DB::table('permissions')->where('name', 'view_genealogy')->value('id');
        DB::table('permission_role')->where('permission_id', $id)->delete();
        DB::table('permissions')->where('id', $id)->delete();
    }
};
