<?php

namespace App\Policies;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;

class PermissionPolicy
{
    public function create(User $user): bool
    {
        return $user->hasRole(Role::SUPERADMIN);
    }

    public function delete(User $user, Permission $permission): bool
    {
        return $user->hasRole(Role::SUPERADMIN);
    }
}
