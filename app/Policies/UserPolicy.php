<?php

namespace App\Policies;

use App\Models\Entities\Team;
use App\Models\Role;
use App\Models\User;
use App\Services\OfficeService;
use App\Services\TeamLeadershipService;

class UserPolicy
{
    // Back-office roles that may look anyone up from the global search.
    public const SEARCH_ROLES = [Role::SUPERADMIN, 'admin', 'staff'];

    // Team leaders and unit managers search too, but only find their own members (SearchController::users).
    // The back office; leaders (their members); office secretaries (the agents of their office's area).
    public function search(User $user): bool
    {
        return $user->hasAnyRole(self::SEARCH_ROLES) || app(TeamLeadershipService::class)->leadsAny($user)
            || app(OfficeService::class)->areasFor($user) !== [];
    }

    public function manage(User $user): bool
    {
        return $user->hasRole(Role::SUPERADMIN);
    }

    // Superadmins manage anyone; admins manage agents and staff, but not other admins or superadmins; anyone else given
    // Management (e.g. staff) only the field roles — not the back office.
    public function updateStatus(User $user, User $target): bool
    {
        if ($user->hasRole(Role::SUPERADMIN)) {
            return true;
        }
        if ($user->is($target)) {
            return false;
        }
        if ($user->hasRole('admin')) {
            return ! $target->hasAnyRole(TeamPolicy::MANAGER_ROLES);
        }

        return $user->can('manage', Team::class) && ! $target->hasAnyRole(self::SEARCH_ROLES);
    }

    // Agent profiles (details and upline) are edited by holders of edit_agent_profile; only a superadmin edits the
    // superadmins' and admins' own.
    public function updateProfile(User $user, User $target): bool
    {
        if (! $user->can('edit_agent_profile')) {
            return false;
        }

        return $user->hasRole(Role::SUPERADMIN) || ! $target->hasAnyRole(TeamPolicy::MANAGER_ROLES);
    }

    public function updatePhoto(User $user, User $target): bool
    {
        return $this->updateStatus($user, $target);
    }
}
