<?php

namespace App\Policies;

use App\Models\Role;
use App\Models\User;

// Sales cutoffs and the sale-recording switch are Settings, which only superadmins manage.
class SalesCutoffPolicy
{
    public function manage(User $user): bool
    {
        return $user->hasRole(Role::SUPERADMIN);
    }
}
