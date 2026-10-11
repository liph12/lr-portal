<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// One permission per report under Reports (ReportsController::PERMISSIONS), managed in Settings › Roles & permissions.
// Every role that could open reports (view_reports) keeps all of them, so nothing changes until a box is unticked.
return new class extends Migration
{
    private const REPORTS = [
        'report_recruits' => 'Report: Recruits',
        'report_recruits_progress' => 'Report: Recruits Progress',
        'report_top_agents' => 'Report: Top Agents',
        'report_top_unit_managers' => 'Report: Top Unit Managers',
        'report_top_teams' => 'Report: Top Teams',
        'report_top_sub_teams' => 'Report: Top Sub-teams',
        'report_area_sales' => 'Report: Sales by Area',
        'report_developer_sales' => 'Report: Developer Sales',
        'report_brokerage_sales' => 'Report: Brokerage Sales',
        'report_rental_sales' => 'Report: Rental Sales',
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
