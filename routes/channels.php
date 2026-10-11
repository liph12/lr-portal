<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Presence for "Online now". Every active signed-in user joins; the array is what other members see,
// so it carries only display fields.
Broadcast::channel('portal.online', function (User $user) {
    if (! $user->isActive()) {
        return false;
    }

    return [
        'id' => $user->id,
        'name' => $user->name,
        'avatar' => $user->agent()->value('avatar'),
        'role' => $user->roles()->value('label'),
    ];
});
