<?php

namespace App\Http\Controllers\Portal\SuperAdmin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\SuperAdmin\Settings\AssignUserRoleRequest;
use App\Models\Role;
use App\Models\User;
use App\Services\RolePermissionService;

class UserRoleController extends Controller
{
    public function __construct(private RolePermissionService $roles) {}

    public function update(AssignUserRoleRequest $request, User $user)
    {
        $role = Role::findOrFail($request->integer('role_id'));

        $this->roles->assignRole($request->user(), $user, $role);

        return back()
            ->with('selected_role', $role->id)
            ->with('success', "{$user->name} is now a {$role->label}.");
    }
}
