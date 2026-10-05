<?php

namespace App\Policies;

use App\Models\User;

class AgentTransactionPolicy
{
    public function create(User $user): bool
    {
        return $user->hasRole('superadmin');
    }
}
