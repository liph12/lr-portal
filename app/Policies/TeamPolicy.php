<?php

namespace App\Policies;

use App\Models\Role;
use App\Models\User;

class TeamPolicy
{
    // Teams, sub-teams, transfers and agent status/photos in Management.
    public const MANAGER_ROLES = [Role::SUPERADMIN, 'admin'];

    public function manage(User $user): bool
    {
        return $user->hasAnyRole(self::MANAGER_ROLES);
    }
}
