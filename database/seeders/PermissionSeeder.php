<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Permission;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = [
            ['name' => 'view_dashboard', 'label' => 'View Dashboard'],
            ['name' => 'view_profile', 'label' => 'View Profile'],
            ['name' => 'search_user', 'label' => 'Search User'],
            ['name' => 'create_report', 'label' => 'Create Report'],
            ['name' => 'view_reports', 'label' => 'View Reports'],
            ['name' => 'edit_settings', 'label' => 'Edit Settings'],
            ['name' => 'edit_user', 'label' => 'Edit User'],
        ];

        foreach ($permissions as $perm) {
            Permission::create($perm);
        }
    }
}
