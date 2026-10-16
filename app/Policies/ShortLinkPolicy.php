<?php

namespace App\Policies;

use App\Models\Entities\ShortLink;
use App\Models\User;

// Short links (QR Code Maker): anyone signed in may make them; only their owner may remove them (superadmin passes every gate).
class ShortLinkPolicy
{
    public function create(User $user): bool
    {
        return true;
    }

    public function delete(User $user, ShortLink $link): bool
    {
        return $link->user_id === $user->id;
    }
}
