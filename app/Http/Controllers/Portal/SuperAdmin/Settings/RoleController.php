<?php

namespace App\Http\Controllers\Portal\SuperAdmin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\SuperAdmin\Settings\StoreRoleRequest;
use App\Http\Requests\SuperAdmin\Settings\UpdateRoleRequest;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\RolePermissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class RoleController extends Controller
{
    public function __construct(private RolePermissionService $roles) {}

    public function index(Request $request)
    {
        Gate::authorize('viewAny', Role::class);

        $roles = Role::query()
            ->withCount('users')
            ->with('permissions:id')
            ->orderBy('id')
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'label' => $role->label,
                'is_system' => $role->isSystem(),
                'is_superadmin' => $role->isSuperadmin(),
                'users_count' => $role->users_count,
                'permission_ids' => $role->permissions->pluck('id'),
            ]);

        $permissions = Permission::query()
            ->withCount('roles')
            ->orderBy('label')
            ->get(['id', 'name', 'label']);

        // Small enough today to send whole; switch to a search endpoint once it reaches the thousands.
        $users = User::query()
            ->with(['roles:id', 'agent:id,user_id,avatar'])
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'status'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->agent?->avatar,
                'role_id' => $user->roles->first()?->id,
                'status' => $user->status,
            ]);

        return inertia('SuperAdmin/Settings/Roles/Index', [
            'roles' => $roles,
            'permissions' => $permissions,
            'users' => $users,
            'statuses' => User::STATUSES,
            // Set after create so the new role opens straight away.
            'selectedRoleId' => $request->session()->get('selected_role'),
        ]);
    }

    public function store(StoreRoleRequest $request)
    {
        $role = $this->roles->createRole($request->validated('label'), $request->validated('permission_ids', []));

        return redirect()
            ->route('superadmin.settings.roles.index')
            ->with('selected_role', $role->id)
            ->with('success', "Role \"{$role->label}\" created.");
    }

    public function update(UpdateRoleRequest $request, Role $role)
    {
        $this->roles->updateRole($role, $request->validated('label'), $request->validated('permission_ids', []));

        return back()
            ->with('selected_role', $role->id)
            ->with('success', "Role \"{$role->label}\" saved.");
    }

    public function destroy(Role $role)
    {
        Gate::authorize('delete', $role);

        $this->roles->deleteRole($role);

        return redirect()
            ->route('superadmin.settings.roles.index')
            ->with('success', "Role \"{$role->label}\" deleted.");
    }
}
