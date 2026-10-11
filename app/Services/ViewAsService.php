<?php

namespace App\Services;

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;

// A superadmin can preview the portal as another role to test what it sees. The account keeps its real
// role and everything is logged.
//
// The preview lives in its own encrypted cookie, not the session: the database session is rewritten whole
// at the end of every request, so a slow background request (leaderboards, online users) that began before
// the switch would save the old session back and silently end the preview.
class ViewAsService
{
    public const COOKIE = 'lr_view_as';

    public function __construct(private ActivityLogger $activity) {}

    public function start(User $user, Role $role): void
    {
        // Lasts until the browser closes, like the preview itself should.
        Cookie::queue(Cookie::make(self::COOKIE, $role->name, 0, null, null, null, true, false, 'lax'));

        $this->activity->describe('auth.view_as_started', "Started viewing the portal as {$role->label}", $user, ['role' => $role->name]);
    }

    public function stop(User $user, Request $request): void
    {
        $role = $request->cookie(self::COOKIE);
        Cookie::queue(Cookie::forget(self::COOKIE));

        if ($role) {
            $this->activity->describe('auth.view_as_stopped', 'Returned to Superadmin', $user, ['role' => $role]);
        }
    }

    public function forget(): void
    {
        Cookie::queue(Cookie::forget(self::COOKIE));
    }

    // Applied on every request by ApplyViewAsRole; ignored unless the account really is a superadmin.
    public function apply(User $user, Request $request): void
    {
        $name = $request->cookie(self::COOKIE);
        $role = is_string($name) && $name !== '' && $user->reallyHasRole(Role::SUPERADMIN)
            ? Role::where('name', $name)->where('name', '!=', Role::SUPERADMIN)->first()
            : null;

        if ($name && ! $role) {
            $this->forget();
        }

        $user->viewAs($role);
    }
}
