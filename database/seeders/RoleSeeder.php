<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Role;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Role::create(['name' => 'superadmin', 'label' => 'Superadmin']);
        Role::create(['name' => 'admin', 'label' => 'Admin']);
        Role::create(['name' => 'staff', 'label' => 'Staff']);
        Role::create(['name' => 'secretary', 'label' => 'Secretary']);
        // Role::create(['name' => 'inactive', 'label' => 'Inactive']);
        // Role::create(['name' => 'salesperson', 'label' => 'Salesperson']);
        // Role::create(['name' => 'global_partner', 'label' => 'Global Partner']);
        // Role::create(['name' => 'unit_manager', 'label' => 'Unit Manager']);
        // Role::create(['name' => 'team_leader', 'label' => 'Team Leader']);
    }
}
