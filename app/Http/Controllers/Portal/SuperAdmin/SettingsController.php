<?php

namespace App\Http\Controllers\Portal\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Entities\SalesCutoff;
use App\Models\Permission;
use App\Models\Role;
use App\Services\SalesEncodingService;

class SettingsController extends Controller
{
    public function index(SalesEncodingService $encoding)
    {
        return inertia('SuperAdmin/Settings/Index', [
            'counts' => [
                'roles' => Role::count(),
                'permissions' => Permission::count(),
                'sales_cutoffs' => SalesCutoff::count(),
            ],
            'salesEncoding' => $encoding->state(),
        ]);
    }
}
