<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// NATCON is for the back office (every board) and team leaders / unit managers (who qualified on their group): take it
// back from the other roles 000045 gave it to, so the menu doesn't offer them a page that refuses them.
return new class extends Migration
{
    private const ROLES = ['superadmin', 'admin', 'staff', 'team_leader', 'unit_manager'];

    public function up(): void
    {
        $permission = DB::table('permissions')->where('name', 'view_natcon')->value('id');
        if (! $permission) {
            return;
        }

        DB::table('permission_role')->where('permission_id', $permission)
            ->whereNotIn('role_id', DB::table('roles')->whereIn('name', self::ROLES)->select('id'))
            ->delete();
    }

    public function down(): void {}
};
