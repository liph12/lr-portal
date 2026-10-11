<?php

namespace App\Services;

use App\Models\Role;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class UserAccountService
{
    public function __construct(private ActivityLogger $activity) {}

    public function changeStatus(User $actor, User $user, string $status): void
    {
        $previous = $user->status;

        if ($previous === $status) {
            return;
        }

        if ($actor->is($user)) {
            throw ValidationException::withMessages([
                'status' => "You can't change your own status. Ask another superadmin.",
            ]);
        }

        if ($status !== User::STATUS_ACTIVE && $user->hasRole(Role::SUPERADMIN) && $this->activeSuperadmins() <= 1) {
            throw ValidationException::withMessages([
                'status' => "{$user->name} is the only active Superadmin. Activate or assign another Superadmin first.",
            ]);
        }

        // Status isn't mass-assignable, so only this service can change it.
        $user->forceFill(['status' => $status, 'status_changed_at' => now()])->save();

        $this->activity->describe('user.status_changed', "Changed {$user->name}'s status from {$previous} to {$status}", $user, [
            'from' => $previous,
            'to' => $status,
        ]);
    }

    private function activeSuperadmins(): int
    {
        return User::where('status', User::STATUS_ACTIVE)
            ->whereHas('roles', fn ($q) => $q->where('name', Role::SUPERADMIN))
            ->count();
    }
}
