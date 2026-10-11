<?php

namespace App\Policies;

use App\Models\User;

class InternationalSalePolicy
{
    public const RECORD_PERMISSION = 'record_international_sales';

    // Granted to Global Partner (manage in Settings); superadmin passes every gate.
    public function create(User $user): bool
    {
        return $user->hasPermission(self::RECORD_PERMISSION);
    }
}
