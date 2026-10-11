<?php

namespace App\Providers;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // One instance per request, shared by services (describe) and the LogActivity middleware (record).
        $this->app->scoped(ActivityLogger::class);
        // Looked up once per request (scoped, so a permission added in Settings counts from the next request).
        $this->app->scoped('permission.names', fn () => Permission::pluck('name')->all());
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Every row in `permissions` is a gate (`can:view_reports`, `@can`, `$user->can(...)`), granted by
        // the user's role. Other abilities fall through to policies as usual.
        Gate::before(function (User $user, string $ability) {
            // Superadmin is the escape hatch: allowed everything, including permissions not created yet.
            if ($user->hasRole(Role::SUPERADMIN)) {
                return true;
            }

            if (! in_array($ability, app('permission.names'), true)) {
                return null;
            }

            return $user->hasPermission($ability);
        });
    }
}
