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

    // Superadmins manage anyone; admins manage agents and staff, but not other admins or superadmins.
    public function updateStatus(User $user, User $target): bool
    {
        if ($user->hasRole(Role::SUPERADMIN)) {
            return true;
        }

        return $user->hasRole('admin') && ! $target->hasAnyRole(TeamPolicy::MANAGER_ROLES);
    }

    public function updatePhoto(User $user, User $target): bool
    {
        return $this->updateStatus($user, $target);
    }
}
