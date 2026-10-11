<?php

namespace App\Policies;

use App\Models\User;

class AgentDocumentPolicy
{
    public const PERMISSION = 'manage_documents';

    // Review agents' documents under Documentation; grant per role in Settings (superadmin passes every gate).
    public function manage(User $user): bool
    {
        return $user->hasPermission(self::PERMISSION);
    }
}
