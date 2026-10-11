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
    private const MEMBERS_PER_PAGE = 20;

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

        // The open role comes from the URL (?role=), else the one just created/changed, else the first.
        $selectedId = (int) ($request->query('role') ?: $request->session()->get('selected_role') ?: $roles->first()['id'] ?? 0);
        $search = trim((string) $request->query('members_q', ''));

        // Paged and searchable: the Agent role alone has tens of thousands of members.
        // A join on role_user (indexed by role) rather than whereHas, which re-checks every user row.
        $members = User::query()
            ->join('role_user', 'role_user.user_id', '=', 'users.id')
            ->where('role_user.role_id', $selectedId)
            ->when($search !== '', function ($q) use ($search) {
                $like = '%'.addcslashes($search, '%_\\').'%';
                $q->where(fn ($w) => $w->where('users.name', 'like', $like)->orWhere('users.email', 'like', $like));
            })
            ->with('agent:id,user_id,avatar')
            ->orderBy('users.name')
            ->paginate(self::MEMBERS_PER_PAGE, ['users.id', 'users.name', 'users.email', 'users.status'], 'members_page')
            ->withQueryString();

        return inertia('SuperAdmin/Settings/Roles/Index', [
            'roles' => $roles,
            'permissions' => $permissions,
            'statuses' => User::STATUSES,
            'selectedRoleId' => $selectedId,
            'members' => [
                'data' => $members->getCollection()->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar' => $user->agent?->avatar,
                    'role_id' => $selectedId,
                    'status' => $user->status,
                ]),
                'page' => $members->currentPage(),
                'last_page' => $members->lastPage(),
                'total' => $members->total(),
                'search' => $search,
            ],
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
