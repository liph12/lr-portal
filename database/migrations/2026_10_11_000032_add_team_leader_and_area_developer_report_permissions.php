<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Two more reports, each its own permission (ReportsController::permission): Top Team Leaders and Developers by Area.
// Every role that can read reports gets them, so nothing is hidden until a box is unticked.
return new class extends Migration
{
    private const REPORTS = [
        'report_top_team_leaders' => 'Report: Top Team Leaders',
        'report_area_developers' => 'Report: Developers by Area',
    ];

    public function up(): void
    {
        $roles = DB::table('roles')->where('name', 'superadmin')
            ->orWhereIn('id', DB::table('permission_role as pr')->join('permissions as p', 'p.id', '=', 'pr.permission_id')->where('p.name', 'view_reports')->select('pr.role_id'))
            ->pluck('id');

        foreach (self::REPORTS as $name => $label) {
            if (DB::table('permissions')->where('name', $name)->exists()) {
                continue;
            }
            $id = DB::table('permissions')->insertGetId(['name' => $name, 'label' => $label, 'created_at' => now(), 'updated_at' => now()]);
            DB::table('permission_role')->insert($roles->map(fn ($role) => ['role_id' => $role, 'permission_id' => $id])->all());
        }
    }

    public function down(): void
    {
        $ids = DB::table('permissions')->whereIn('name', array_keys(self::REPORTS))->pluck('id');
        DB::table('permission_role')->whereIn('permission_id', $ids)->delete();
        DB::table('permissions')->whereIn('id', $ids)->delete();
    }
};
