<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// SMS Manager: sending (superadmin, team leaders — who pay with credits) and managing it (superadmin: credit requests,
// the company's Semaphore balance, every recipient nationwide).
return new class extends Migration
{
    private const GRANTS = [
        'send_sms' => ['SMS: Send text messages', ['superadmin', 'team_leader']],
        'manage_sms' => ['SMS: Manage SMS (credit requests, company balance, nationwide)', ['superadmin']],
    ];

    public function up(): void
    {
        foreach (self::GRANTS as $name => [$label, $roles]) {
            if (DB::table('permissions')->where('name', $name)->exists()) {
                continue;
            }
            $id = DB::table('permissions')->insertGetId(['name' => $name, 'label' => $label, 'created_at' => now(), 'updated_at' => now()]);
            DB::table('permission_role')->insert(DB::table('roles')->whereIn('name', $roles)->pluck('id')->map(fn ($role) => ['role_id' => $role, 'permission_id' => $id])->all());
        }
    }

    public function down(): void
    {
        $ids = DB::table('permissions')->whereIn('name', array_keys(self::GRANTS))->pluck('id');
        DB::table('permission_role')->whereIn('permission_id', $ids)->delete();
        DB::table('permissions')->whereIn('id', $ids)->delete();
    }
};
