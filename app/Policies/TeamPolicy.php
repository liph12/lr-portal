<?php

namespace App\Policies;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;

class TeamPolicy
{
    // Roles nobody below a superadmin may change in Management (admins can't touch each other).
    public const MANAGER_ROLES = [Role::SUPERADMIN, 'admin'];

    // Management is open to whoever holds any of its permissions (superadmins pass every gate); each change then needs
    // its own one (Permission::MANAGEMENT), checked in the Form Requests.
    public function manage(User $user): bool
    {
        return collect(array_keys(Permission::MANAGEMENT))->contains(fn (string $permission) => $user->hasPermission($permission));
    }
}
