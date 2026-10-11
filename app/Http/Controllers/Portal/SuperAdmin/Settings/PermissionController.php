<?php

namespace App\Http\Controllers\Portal\SuperAdmin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\SuperAdmin\Settings\StorePermissionRequest;
use App\Models\Permission;
use App\Services\RolePermissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class PermissionController extends Controller
{
    public function __construct(private RolePermissionService $roles) {}

    public function store(StorePermissionRequest $request)
    {
        $permission = $this->roles->createPermission($request->validated('label'));

        return back()
            ->with('selected_role', $request->integer('selected_role') ?: null)
            ->with('success', "Permission \"{$permission->label}\" added.");
    }

    public function destroy(Request $request, Permission $permission)
    {
        Gate::authorize('delete', $permission);

        $this->roles->deletePermission($permission);

        return back()
            ->with('selected_role', $request->integer('selected_role') ?: null)
            ->with('success', "Permission \"{$permission->label}\" deleted.");
    }
}
