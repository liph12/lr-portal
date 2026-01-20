<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\Permission;

class PermissionRoleSeeder extends Seeder
{
    public function run()
    {
        $superadmin = Role::where('name', 'superadmin')->first();
        $admin = Role::where('name', 'admin')->first();
        $staff = Role::where('name', 'staff')->first();
        $sec = Role::where('name', 'secretary')->first();

        $allPermissions = Permission::pluck('id')->toArray();

        $superadmin->permissions()->sync($allPermissions);

        $admin->permissions()->sync([
            Permission::where('name', 'view_dashboard')->value('id'),
            Permission::where('name', 'view_profile')->value('id'),
            Permission::where('name', 'view_reports')->value('id'),
            Permission::where('name', 'search_user')->value('id'),
            Permission::where('name', 'create_report')->value('id'),
            Permission::where('name', 'edit_user')->value('id'),
        ]);

        $staff->permissions()->sync([
            Permission::where('name', 'view_dashboard')->value('id'),
            Permission::where('name', 'view_profile')->value('id'),
            Permission::where('name', 'view_reports')->value('id'),
            Permission::where('name', 'search_user')->value('id'),
            Permission::where('name', 'create_report')->value('id'),
        ]);

        $sec->permissions()->sync([
            Permission::where('name', 'view_dashboard')->value('id'),
            Permission::where('name', 'view_profile')->value('id'),
            Permission::where('name', 'view_reports')->value('id'),
        ]);
    }
}
