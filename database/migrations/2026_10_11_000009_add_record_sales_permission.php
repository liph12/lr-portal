<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Recording sales from the shared dashboard: field roles get it now; any other role can be granted it in Settings.
return new class extends Migration
{
    private const ROLES = ['superadmin', 'agent', 'team_leader', 'unit_manager'];

    public function up(): void
    {
        $id = DB::table('permissions')->where('name', 'record_sales')->value('id')
            ?? DB::table('permissions')->insertGetId([
                'name' => 'record_sales',
                'label' => 'Record Sales',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

        DB::table('permission_role')->insertOrIgnore(
            DB::table('roles')->whereIn('name', self::ROLES)->pluck('id')
                ->map(fn ($roleId) => ['role_id' => $roleId, 'permission_id' => $id])
                ->all()
        );
    }

    public function down(): void
    {
        $id = DB::table('permissions')->where('name', 'record_sales')->value('id');

        if ($id) {
            DB::table('permission_role')->where('permission_id', $id)->delete();
            DB::table('permissions')->where('id', $id)->delete();
        }
    }
};
