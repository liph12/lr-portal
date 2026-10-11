<?php

namespace App\Services;

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

// A superadmin signs in as a specific user (to see exactly what they see) and returns to their own account.
// The original account is remembered in the session; the session id is regenerated on every switch, so a slow
// background request still holding the old session can't undo it.
class ImpersonationService
{
    public const SESSION_KEY = 'impersonator_id';

    public function __construct(private ActivityLogger $activity, private ViewAsService $viewAs) {}

    public function impersonator(Request $request): ?User
    {
        $id = $request->hasSession() ? $request->session()->get(self::SESSION_KEY) : null;

        return $id ? User::find($id) : null;
    }

    public function start(Request $request, User $target): void
    {
        $me = $request->user();

        if ($target->is($me) || $target->reallyHasRole(Role::SUPERADMIN)) {
            throw ValidationException::withMessages(['user' => "You can't sign in as another superadmin."]);
        }
        if (! $target->isActive()) {
            throw ValidationException::withMessages(['user' => "{$target->name} isn't active, so they can't be signed in."]);
        }

        $this->activity->describe('auth.impersonation_started', "Signed in as {$target->name}", $target, ['impersonator_id' => $me->id]);

        // A role preview belongs to the superadmin's own session, not the person they become.
        $this->viewAs->forget();
        Auth::login($target);
        $request->session()->migrate(true);
        $request->session()->put(self::SESSION_KEY, $me->id);
    }

    public function stop(Request $request): User
    {
        $original = $this->impersonator($request);
        $was = $request->user();

        abort_unless($original && $original->reallyHasRole(Role::SUPERADMIN), 403);

        Auth::login($original);
        $request->session()->migrate(true);
        $request->session()->forget(self::SESSION_KEY);

        $this->activity->describe('auth.impersonation_stopped', "Returned from {$was?->name}'s account", $was, ['impersonator_id' => $original->id]);

        return $original;
    }
}
