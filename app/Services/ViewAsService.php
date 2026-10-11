<?php

namespace App\Services;

use App\Models\Role;
use App\Models\User;
use Illuminate\Contracts\Session\Session;

// A superadmin can preview the portal as another role to test what it sees. Only the session
// changes: the account keeps its real role, and everything is logged.
class ViewAsService
{
    public const SESSION_KEY = 'view_as_role';

    public function __construct(private ActivityLogger $activity) {}

    public function start(User $user, Role $role, Session $session): void
    {
        $session->put(self::SESSION_KEY, $role->name);

        $this->activity->describe('auth.view_as_started', "Started viewing the portal as {$role->label}", $user, ['role' => $role->name]);
    }

    public function stop(User $user, Session $session): void
    {
        $role = $session->pull(self::SESSION_KEY);

        if ($role) {
            $this->activity->describe('auth.view_as_stopped', 'Returned to Superadmin', $user, ['role' => $role]);
        }
    }

    // Applied on every request by ApplyViewAsRole; ignored unless the account really is a superadmin.
    public function apply(User $user, Session $session): void
    {
        $name = $session->get(self::SESSION_KEY);
        $role = $name && $user->reallyHasRole(Role::SUPERADMIN)
            ? Role::where('name', $name)->where('name', '!=', Role::SUPERADMIN)->first()
            : null;

        if ($name && ! $role) {
            $session->forget(self::SESSION_KEY);
        }

        $user->viewAs($role);
    }
}
