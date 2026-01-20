<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use App\Models\Role;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $superadmin = User::create([
            'name' => 'Philip Libres',
            'email' => 'libresphilip14@gmail.com',
            'password' => Hash::make('12345'),
        ]);

        $admin = User::create([
            'name' => 'John Nel Lim',
            'email' => 'johnnellim@gmail.com',
            'password' => Hash::make('12345'),
        ]);

        $staff = User::create([
            'name' => 'John Robert Maizo',
            'email' => 'johnrobertmaizo@gmail.com',
            'password' => Hash::make('12345'),
        ]);

        $sec = User::create([
            'name' => 'Chyme Yap',
            'email' => 'chymeelny@gmail.com',
            'password' => Hash::make('12345'),
        ]);

        $superadmin->roles()->sync([Role::where('name', 'superadmin')->value('id')]);
        $admin->roles()->sync([Role::where('name', 'admin')->value('id')]);
        $staff->roles()->sync([Role::where('name', 'staff')->value('id')]);
        $sec->roles()->sync([Role::where('name', 'secretary')->value('id')]);
    }
}
