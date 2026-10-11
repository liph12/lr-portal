<?php

namespace App\Policies;

use App\Models\User;

class AgentTransactionPolicy
{
    public const RECORD_PERMISSION = 'record_sales';

    // Granted to agents, team leaders and unit managers (manage in Settings); superadmin passes every gate.
    public function create(User $user): bool
    {
        return $user->hasPermission(self::RECORD_PERMISSION);
    }
}
