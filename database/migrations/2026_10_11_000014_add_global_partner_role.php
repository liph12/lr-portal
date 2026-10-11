<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Global partners sell from abroad and record international sales (not project/rental/brokerage).
return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        $permissionId = DB::table('permissions')->where('name', 'record_international_sales')->value('id')
            ?? DB::table('permissions')->insertGetId(['name' => 'record_international_sales', 'label' => 'Record International Sales', 'created_at' => $now, 'updated_at' => $now]);

        // Field roles come from the member import (which also creates this one); only add it beside them.
        if (! DB::table('roles')->where('name', 'agent')->exists()) {
            DB::table('permission_role')->insertOrIgnore(
                DB::table('roles')->where('name', 'superadmin')->pluck('id')->map(fn ($id) => ['role_id' => $id, 'permission_id' => $permissionId])->all()
            );

            return;
        }

        $roleId = DB::table('roles')->where('name', 'global_partner')->value('id')
            ?? DB::table('roles')->insertGetId(['name' => 'global_partner', 'label' => 'Global Partner', 'created_at' => $now, 'updated_at' => $now]);

        DB::table('permission_role')->insertOrIgnore(
            DB::table('roles')->whereIn('name', ['superadmin', 'global_partner'])->pluck('id')
                ->map(fn ($id) => ['role_id' => $id, 'permission_id' => $permissionId])->all()
        );

        // Leaderboards are visible to field roles, so global partners see them too.
        $leaderboards = DB::table('permissions')->where('name', 'view_leaderboards')->value('id');
        if ($leaderboards && DB::table('permission_role')->where('permission_id', $leaderboards)->whereIn('role_id', DB::table('roles')->where('name', 'agent')->select('id'))->exists()) {
            DB::table('permission_role')->insertOrIgnore(['role_id' => $roleId, 'permission_id' => $leaderboards]);
        }
    }

    public function down(): void
    {
        $permissionId = DB::table('permissions')->where('name', 'record_international_sales')->value('id');
        if ($permissionId) {
            DB::table('permission_role')->where('permission_id', $permissionId)->delete();
            DB::table('permissions')->where('id', $permissionId)->delete();
        }

        // Only an unused role is removed; reassign its users first.
        $roleId = DB::table('roles')->where('name', 'global_partner')->value('id');
        if ($roleId && ! DB::table('role_user')->where('role_id', $roleId)->exists()) {
            DB::table('permission_role')->where('role_id', $roleId)->delete();
            DB::table('roles')->where('id', $roleId)->delete();
        }
    }
};
