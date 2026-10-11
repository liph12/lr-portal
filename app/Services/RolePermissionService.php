<?php

namespace App\Services;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class RolePermissionService
{
    public function __construct(private ActivityLogger $activity) {}

    // The machine name is derived once from the label and never changes, since code checks roles by name.
    public static function slug(string $label): string
    {
        return Str::of(Str::ascii($label))->lower()->replaceMatches('/[^a-z0-9]+/', '_')->trim('_')->toString();
    }

    /**
     * @param  int[]  $permissionIds
     */
    public function createRole(string $label, array $permissionIds): Role
    {
        $role = DB::transaction(function () use ($label, $permissionIds) {
            $role = Role::create(['name' => self::slug($label), 'label' => trim($label)]);
            $role->permissions()->sync($permissionIds);

            return $role;
        });

        $this->activity->describe('role.created', "Created role {$role->label}", $role, [
            'permissions' => $this->permissionNames($permissionIds),
        ]);

        return $role;
    }

    /**
     * @param  int[]  $permissionIds
     */
    public function updateRole(Role $role, string $label, array $permissionIds): Role
    {
        // Superadmin is the escape hatch for every screen; it always keeps every permission.
        $permissionIds = $role->isSuperadmin() ? Permission::pluck('id')->all() : $permissionIds;
        $before = $role->permissions()->pluck('permissions.id')->all();

        DB::transaction(function () use ($role, $label, $permissionIds) {
            $role->update(['label' => trim($label)]);
            $role->permissions()->sync($permissionIds);
        });

        $this->activity->describe('role.updated', "Updated role {$role->label}", $role, [
            'granted' => $this->permissionNames(array_diff($permissionIds, $before)),
            'revoked' => $this->permissionNames(array_diff($before, $permissionIds)),
        ]);

        return $role;
    }

    public function deleteRole(Role $role): void
    {
        if ($role->isSystem()) {
            throw ValidationException::withMessages([
                'role' => "{$role->label} is a built-in role and can't be deleted.",
            ]);
        }

        $users = $role->users()->count();

        if ($users > 0) {
            throw ValidationException::withMessages([
                'role' => "{$role->label} is assigned to {$users} ".Str::plural('user', $users).'. Move them to another role first.',
            ]);
        }

        $label = $role->label;
        $role->permissions()->detach();
        $role->delete();

        $this->activity->describe('role.deleted', "Deleted role {$label}", null, ['role' => $role->name]);
    }

    // One role per user: assigning replaces whatever role they had.
    public function assignRole(User $actor, User $user, Role $role): void
    {
        $current = $user->roles()->first();

        if ($current?->is($role)) {
            return;
        }

        if ($actor->is($user)) {
            throw ValidationException::withMessages([
                'role' => "You can't change your own role. Ask another superadmin.",
            ]);
        }

        if ($current?->isSuperadmin() && $current->users()->count() <= 1) {
            throw ValidationException::withMessages([
                'role' => "{$user->name} is the only Superadmin. Make someone else a Superadmin first.",
            ]);
        }

        $user->roles()->sync([$role->id]);

        $from = $current?->label ?? 'no role';
        $this->activity->describe('role.assigned', "Changed {$user->name}'s role from {$from} to {$role->label}", $user, [
            'from' => $current?->name,
            'to' => $role->name,
        ]);
    }

    public function createPermission(string $label): Permission
    {
        $permission = DB::transaction(function () use ($label) {
            $permission = Permission::create(['name' => self::slug($label), 'label' => trim($label)]);
            Role::where('name', Role::SUPERADMIN)->first()?->permissions()->attach($permission);

            return $permission;
        });

        $this->activity->describe('permission.created', "Created permission {$permission->label}", $permission);

        return $permission;
    }

    public function deletePermission(Permission $permission): void
    {
        $label = $permission->label;
        $roles = $permission->roles()->pluck('label')->all();

        DB::transaction(function () use ($permission) {
            $permission->roles()->detach();
            $permission->delete();
        });

        $this->activity->describe('permission.deleted', "Deleted permission {$label}", null, [
            'permission' => $permission->name,
            'removed_from_roles' => $roles,
        ]);
    }

    /**
     * @param  int[]  $ids
     * @return string[]
     */
    private function permissionNames(array $ids): array
    {
        return $ids ? Permission::whereIn('id', $ids)->orderBy('name')->pluck('name')->all() : [];
    }
}
