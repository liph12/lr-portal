<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Recruits Progress › AI analysis › Send report (email to the team leader / unit manager). Given to no role: only the superadmin
// (who passes every permission) sends it, until a role is ticked in Settings.
return new class extends Migration
{
    private const NAME = 'send_recruits_ai_report';

    public function up(): void
    {
        if (! DB::table('permissions')->where('name', self::NAME)->exists()) {
            DB::table('permissions')->insert(['name' => self::NAME, 'label' => 'Send the Recruits Progress AI analysis by email', 'created_at' => now(), 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        $id = DB::table('permissions')->where('name', self::NAME)->value('id');
        DB::table('permission_role')->where('permission_id', $id)->delete();
        DB::table('permissions')->where('id', $id)->delete();
    }
};
