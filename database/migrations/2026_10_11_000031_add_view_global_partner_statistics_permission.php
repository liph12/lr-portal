<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Global Partners › Statistics gets its own permission (Settings › Roles & permissions › Statistics). The back office sees
// every partner's; agents, unit managers and team leaders see the partners they recruited (GlobalPartnerService::reach).
return new class extends Migration
{
    private const ROLES = ['superadmin', 'admin', 'staff', 'agent', 'unit_manager', 'team_leader'];

    public function up(): void
    {
        if (DB::table('permissions')->where('name', 'view_global_partner_statistics')->exists()) {
            return;
        }

        $id = DB::table('permissions')->insertGetId([
            'name' => 'view_global_partner_statistics',
            'label' => 'View Global Partner Statistics',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('permission_role')->insert(
            DB::table('roles')->whereIn('name', self::ROLES)->pluck('id')->map(fn ($role) => ['role_id' => $role, 'permission_id' => $id])->all()
        );
    }

    public function down(): void
    {
        $id = DB::table('permissions')->where('name', 'view_global_partner_statistics')->value('id');
        if ($id) {
            DB::table('permission_role')->where('permission_id', $id)->delete();
            DB::table('permissions')->where('id', $id)->delete();
        }
    }
};
