<?php

namespace App\Policies;

use App\Models\Role;
use App\Models\User;

class UserPolicy
{
    // Back-office roles that may look people up from the global search.
    public const SEARCH_ROLES = [Role::SUPERADMIN, 'admin', 'staff'];

    public function search(User $user): bool
    {
        return $user->hasAnyRole(self::SEARCH_ROLES);
    }

    public function manage(User $user): bool
    {
        return $user->hasRole(Role::SUPERADMIN);
    }

    public function updateStatus(User $user, User $target): bool
    {
        return $user->hasRole(Role::SUPERADMIN);
    }
}
