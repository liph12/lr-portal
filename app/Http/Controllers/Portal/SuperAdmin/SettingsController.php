<?php

namespace App\Http\Controllers\Portal\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;

class SettingsController extends Controller
{
    public function index()
    {
        return inertia('SuperAdmin/Settings/Index', [
            'counts' => [
                'roles' => Role::count(),
                'permissions' => Permission::count(),
            ],
        ]);
    }
}
